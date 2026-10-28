import { createHash, verify } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { validAddress } from "./validation";
import type { Token } from "./tokens";

const address = z
  .string()
  .refine(validAddress, "Enter a valid Solana address.");
const safeText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v),
      "Remove control characters.",
    );
const website = z
  .string()
  .trim()
  .max(200)
  .refine(
    (v) =>
      !v ||
      (/^https:\/\//i.test(v) &&
        (() => {
          try {
            const u = new URL(v);
            return !u.username && !u.password;
          } catch {
            return false;
          }
        })()),
    "Use an https:// website.",
  );
export const communityAction = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("profile"),
      name: safeText(32).min(2),
      bio: safeText(240),
      website,
      accent: z.enum(["cyan", "violet", "green", "pink"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("callout"),
      mint: address,
      text: safeText(500).min(8),
      disclosure: z.enum(["none", "paid", "team"]),
    })
    .strict(),
  z
    .object({ kind: z.literal("delete-callout"), id: z.string().uuid() })
    .strict(),
  z
    .object({
      kind: z.literal("report"),
      id: z.string().uuid(),
      reason: z.enum(["spam", "impersonation", "misleading", "abuse"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("launch"),
      mint: address,
      name: safeText(32)
        .min(1)
        .refine((v) => Buffer.byteLength(v) <= 32),
      symbol: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]{1,13}$/),
      description: safeText(500).min(8),
      website,
      image: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
]);
export type CommunityAction = z.infer<typeof communityAction>;
export type Profile = {
  wallet: string;
  name: string;
  bio: string;
  website: string;
  accent: "cyan" | "violet" | "green" | "pink";
  updatedAt: number;
};
export type Callout = {
  id: string;
  wallet: string;
  token: Token;
  text: string;
  disclosure: "none" | "paid" | "team";
  createdAt: number;
  holdingCheckedAt: number;
  holdingSlot: number;
};
export type LaunchRecord = {
  id: string;
  wallet: string;
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  metadataUri: string;
  signature: string;
  createdAt: number;
};
export type CommunityState = {
  version: 1;
  profiles: Record<string, Profile>;
  callouts: Callout[];
  launches: LaunchRecord[];
  usedProofs: Record<string, number>;
  reports: Record<
    string,
    { wallet: string; reason: string; createdAt: number }[]
  >;
  lastLaunch: Record<string, number>;
  pendingLaunches?: string[];
};
export const emptyCommunity = (): CommunityState => ({
  version: 1,
  profiles: {},
  callouts: [],
  launches: [],
  usedProofs: {},
  reports: {},
  lastLaunch: {},
});
export type Challenge = {
  id: string;
  wallet: string;
  origin: string;
  action: CommunityAction;
  issuedAt: number;
  expiresAt: number;
  message: string;
};
export const actionDigest = (action: CommunityAction) =>
  createHash("sha256").update(JSON.stringify(action)).digest("hex");
export function challengeMessage(challenge: Omit<Challenge, "message">) {
  const a = challenge.action;
  const details =
    a.kind === "profile"
      ? `Display name: ${a.name}\nBio: ${a.bio}\nWebsite: ${a.website || "None"}\nAccent: ${a.accent}`
      : a.kind === "callout"
        ? `Token: ${a.mint}\nPost: ${a.text}\nPromotion disclosure: ${a.disclosure}`
        : a.kind === "launch"
          ? `Token: ${a.name} (${a.symbol})\nMint: ${a.mint}\nDescription: ${a.description}\nWebsite: ${a.website || "None"}\nAuthorize publishing the submitted image and metadata. A separate transaction approval is required to create the token.`
          : `${a.kind}: ${a.id}${a.kind === "report" ? `\nReason: ${a.reason}` : ""}`;
  return `${new URL(challenge.origin).host} requests your approval for FOMOLAUNCH.\n\nWallet: ${challenge.wallet}\nAction: ${a.kind}\n${details}\n\nPayload SHA-256: ${actionDigest(a)}\nURI: ${challenge.origin}/launch\nNetwork: Solana mainnet\nNonce: ${challenge.id}\nIssued: ${new Date(challenge.issuedAt).toISOString()}\nExpires: ${new Date(challenge.expiresAt).toISOString()}\n\nThis message does not transfer funds.`;
}
export function verifyWalletMessage(
  wallet: string,
  message: string,
  signature: string,
) {
  if (!validAddress(wallet) || !/^[A-Za-z0-9+/]{86}==$/.test(signature))
    return false;
  try {
    return verify(
      null,
      Buffer.from(message),
      {
        key: Buffer.concat([
          Buffer.from("302a300506032b6570032100", "hex"),
          new PublicKey(wallet).toBuffer(),
        ]),
        format: "der",
        type: "spki",
      },
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}
export function verifyChallenge(
  challenge: Challenge,
  signature: string,
  origin: string,
  now: number,
) {
  if (
    challenge.origin !== origin ||
    now >= challenge.expiresAt ||
    now < challenge.issuedAt ||
    challenge.expiresAt - challenge.issuedAt > 300_000 ||
    challenge.message !== challengeMessage(challenge) ||
    !verifyWalletMessage(challenge.wallet, challenge.message, signature)
  )
    throw new Error(
      "Wallet approval is invalid or expired. Please sign a new request.",
    );
}
export function consumeProof(state: CommunityState, c: Challenge, now: number) {
  if (state.usedProofs[c.id])
    throw new Error("This wallet approval has already been used.");
  if (now >= c.expiresAt)
    throw new Error("Wallet approval expired. Please try again.");
  for (const [id, expiry] of Object.entries(state.usedProofs))
    if (expiry < now) delete state.usedProofs[id];
  state.usedProofs[c.id] = c.expiresAt;
}
export function heldTokenAmount(result: any, wallet: string, mint: string) {
  if (
    !result ||
    !Array.isArray(result.value) ||
    !Number.isSafeInteger(result.context?.slot)
  )
    throw new Error("Holdings could not be verified. Please retry.");
  let total = 0n;
  for (const item of result.value) {
    const info = item.account?.data?.parsed?.info;
    if (
      ![
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
      ].includes(item.account?.owner) ||
      info?.owner !== wallet ||
      info?.mint !== mint ||
      !/^\d+$/.test(info?.tokenAmount?.amount || "")
    )
      throw new Error("Holdings could not be verified. Please retry.");
    if (info.state === "initialized") total += BigInt(info.tokenAmount.amount);
  }
  return {
    raw: total.toString(),
    slot: result.context.slot,
    eligible: total > 0n,
  };
}
export function applyCommunityAction(
  state: CommunityState,
  c: Challenge,
  now: number,
  extra?: {
    token: Token;
    holding: { eligible: boolean; slot: number; checkedAt: number };
  },
) {
  consumeProof(state, c, now);
  const a = c.action;
  if (a.kind === "profile") {
    if (!state.profiles[c.wallet] && Object.keys(state.profiles).length >= 5000)
      throw new Error("Profiles are at capacity. Please try again later.");
    state.profiles[c.wallet] = {
      wallet: c.wallet,
      name: a.name,
      bio: a.bio,
      website: a.website,
      accent: a.accent,
      updatedAt: now,
    };
  } else if (a.kind === "callout") {
    if (!state.profiles[c.wallet])
      throw new Error("Create your profile before posting a callout.");
    if (
      !extra?.holding.eligible ||
      extra.token.address !== a.mint ||
      now - extra.holding.checkedAt > 30_000
    )
      throw new Error(
        "Hold this token in your connected wallet to post a callout.",
      );
    const recent = state.callouts.filter(
      (p) => p.wallet === c.wallet && p.createdAt > now - 3_600_000,
    );
    if (recent.some((p) => p.createdAt > now - 60_000) || recent.length >= 10)
      throw new Error(
        "Please wait before posting again. Maximum 10 callouts per hour.",
      );
    if (state.callouts.length >= 5000)
      throw new Error("The callout feed is at capacity. Please try later.");
    state.callouts.unshift({
      id: c.id,
      wallet: c.wallet,
      token: extra.token,
      text: a.text,
      disclosure: a.disclosure,
      createdAt: now,
      holdingCheckedAt: extra.holding.checkedAt,
      holdingSlot: extra.holding.slot,
    });
  } else if (a.kind === "delete-callout") {
    const post = state.callouts.find((p) => p.id === a.id);
    if (!post || post.wallet !== c.wallet)
      throw new Error("Only the author can remove this callout.");
    state.callouts = state.callouts.filter((p) => p.id !== a.id);
    delete state.reports[a.id];
  } else if (a.kind === "report") {
    if (!state.callouts.some((p) => p.id === a.id))
      throw new Error("Callout not found.");
    const reports = state.reports[a.id] || [];
    if (!reports.some((r) => r.wallet === c.wallet) && reports.length < 50)
      reports.push({ wallet: c.wallet, reason: a.reason, createdAt: now });
    state.reports[a.id] = reports;
  } else {
    if (now - (state.lastLaunch[c.wallet] || 0) < 60_000)
      throw new Error("Please wait a minute before preparing another launch.");
    if (state.launches.length >= 2000)
      throw new Error("Launch registration is at capacity.");
    state.lastLaunch[c.wallet] = now;
  }
  return state;
}
