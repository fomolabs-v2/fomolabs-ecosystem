import "server-only";
import { randomUUID } from "node:crypto";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import {
  emptyCommunity,
  challengeMessage,
  verifyChallenge,
  type CommunityState,
  type Challenge,
  type CommunityAction,
} from "./community";
import { rpc } from "./server";
import { heldTokenAmount } from "./community";
const root =
  process.env.VERCEL_ENV === "preview"
    ? "fomolaunch-preview-v1"
    : "fomolaunch-v1";
const options = {
  access: "private" as const,
  addRandomSuffix: false,
  contentType: "application/json",
  cacheControlMaxAge: 60,
};
export async function readPrivate<T>(path: string) {
  const data = await get(`${root}/${path}`, {
    access: "private",
    useCache: false,
  });
  if (!data) return null;
  if (data.statusCode !== 200 || !data.stream)
    throw new Error("FOMOLAUNCH storage is unavailable.");
  return {
    value: (await new Response(data.stream).json()) as T,
    etag: data.blob.etag,
  };
}
export async function writePrivate(
  path: string,
  value: unknown,
  etag?: string,
) {
  return put(`${root}/${path}`, JSON.stringify(value), {
    ...options,
    allowOverwrite: !!etag,
    ...(etag ? { ifMatch: etag } : {}),
  });
}
export async function readCommunity() {
  return (
    (await readPrivate<CommunityState>("community.json"))?.value ||
    emptyCommunity()
  );
}
export async function mutateCommunity(change: (state: CommunityState) => void) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await readPrivate<CommunityState>("community.json");
    const state = current?.value || emptyCommunity();
    change(state);
    try {
      await writePrivate("community.json", state, current?.etag);
      return state;
    } catch (error) {
      if (!(error instanceof BlobPreconditionFailedError) && current)
        throw error;
      if (attempt === 7) throw new Error("FOMOLAUNCH is busy. Please retry.");
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
    }
  }
  throw new Error("FOMOLAUNCH is busy. Please retry.");
}
export async function createChallenge(
  wallet: string,
  origin: string,
  action: CommunityAction,
) {
  const base = {
    id: randomUUID(),
    wallet,
    origin,
    action,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 300_000,
  };
  const challenge = { ...base, message: challengeMessage(base) };
  await writePrivate(`challenges/${base.id}.json`, challenge);
  return { id: base.id, message: challenge.message, expiresAt: base.expiresAt };
}
export async function authorizedChallenge(
  id: string,
  signature: string,
  origin: string,
) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid approval request.");
  const stored = await readPrivate<Challenge>(`challenges/${id}.json`);
  if (!stored) throw new Error("Approval request not found. Please try again.");
  verifyChallenge(stored.value, signature, origin, Date.now());
  return stored.value;
}
export async function tokenHolding(wallet: string, mint: string) {
  const result = await rpc("getTokenAccountsByOwner", [
    wallet,
    { mint },
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]);
  return { ...heldTokenAmount(result, wallet, mint), checkedAt: Date.now() };
}
