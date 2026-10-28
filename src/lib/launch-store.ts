import "server-only";
import { randomUUID, createHash } from "node:crypto";
import sharp from "sharp";
import { PUMP_SDK } from "@pump-fun/pump-sdk";
import { PublicKey } from "@solana/web3.js";
import {
  applyCommunityAction,
  type Challenge,
  type LaunchRecord,
} from "./community";
import { readPrivate, writePrivate, mutateCommunity } from "./community-store";
import { rpc } from "./server";
import {
  buildLaunchTransaction,
  confirmedLaunchTransaction,
  GLOBAL_PDA,
  LAUNCH_ORIGIN,
  launchMessageHash,
  type PreparedLaunch,
} from "./launch-safety";
export type StoredMetadata = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  imageBase64: string;
  owner: string;
};
export async function prepareLaunch(c: Challenge, imageData: string) {
  if (process.env.VERCEL_ENV === "preview")
    throw new Error(
      "Open the production FomoLabs site to create a token. Preview metadata is isolated.",
    );
  const a = c.action;
  if (a.kind !== "launch") throw new Error("Invalid launch approval.");
  const mint = new PublicKey(a.mint);
  if (!PublicKey.isOnCurve(mint.toBytes()) || a.mint === c.wallet)
    throw new Error("Generate a new token mint before launching.");
  const existing = await rpc("getAccountInfo", [
    a.mint,
    { encoding: "base64", commitment: "confirmed" },
  ]);
  if (existing?.value)
    throw new Error("This token mint already exists. Start a new launch.");
  await mutateCommunity((state) => {
    applyCommunityAction(state, c, Date.now());
  });
  if (
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(imageData) ||
    imageData.length > 2_000_000
  )
    throw new Error("Use a PNG, JPEG, or WebP image under 1.4 MB.");
  const imageBytes = Buffer.from(imageData.split(",")[1], "base64");
  if (createHash("sha256").update(imageBytes).digest("hex") !== a.image)
    throw new Error(
      "Image changed after wallet approval. Please review again.",
    );
  const image = await sharp(imageBytes, {
    limitInputPixels: 16_000_000,
    animated: false,
  })
    .rotate()
    .resize(512, 512, { fit: "cover" })
    .webp({ quality: 88 })
    .toBuffer();
  const imageUrl = `${LAUNCH_ORIGIN}/api/launch/image/${a.mint}`;
  const uri = `${LAUNCH_ORIGIN}/api/launch/metadata/${a.mint}`;
  const stored = await readPrivate<StoredMetadata>(`metadata/${a.mint}.json`);
  if (
    stored &&
    (stored.value.owner !== c.wallet ||
      stored.value.name !== a.name ||
      stored.value.symbol !== a.symbol ||
      stored.value.description !== a.description ||
      stored.value.external_url !== a.website ||
      stored.value.imageBase64 !== image.toString("base64"))
  )
    throw new Error("Token metadata is already reserved. Start a new launch.");
  if (!stored)
    await writePrivate(`metadata/${a.mint}.json`, {
      name: a.name,
      symbol: a.symbol,
      description: a.description,
      image: imageUrl,
      external_url: a.website,
      imageBase64: image.toString("base64"),
      owner: c.wallet,
    } satisfies StoredMetadata);
  const [latest, balance, globalAccount] = await Promise.all([
    rpc("getLatestBlockhash", [{ commitment: "confirmed" }]),
    rpc("getBalance", [c.wallet, { commitment: "confirmed" }]),
    rpc("getAccountInfo", [
      GLOBAL_PDA.toBase58(),
      { encoding: "base64", commitment: "confirmed" },
    ]),
  ]);
  if (!globalAccount?.value || !balance || !Number.isSafeInteger(balance.value))
    throw new Error("Launch network information is unavailable.");
  const global = PUMP_SDK.decodeGlobal({
    ...globalAccount.value,
    data: Buffer.from(globalAccount.value.data[0], "base64"),
    owner: new PublicKey(globalAccount.value.owner),
  });
  const tx = await buildLaunchTransaction({
    wallet: c.wallet,
    mint: a.mint,
    name: a.name,
    symbol: a.symbol,
    uri,
    blockhash: latest.value.blockhash,
  });
  const encoded = Buffer.from(tx.serialize()).toString("base64");
  const [sim, fee] = await Promise.all([
    rpc("simulateTransaction", [
      encoded,
      {
        encoding: "base64",
        sigVerify: false,
        replaceRecentBlockhash: false,
        commitment: "confirmed",
        accounts: { encoding: "base64", addresses: [c.wallet] },
      },
    ]),
    rpc("getFeeForMessage", [
      Buffer.from(tx.message.serialize()).toString("base64"),
      { commitment: "confirmed" },
    ]),
  ]);
  if (sim?.value?.err) {
    console.warn("Launch preflight rejected", JSON.stringify(sim.value.err));
    throw new Error(
      "Launch simulation failed. Check your SOL balance for network fees and account rent, then retry.",
    );
  }
  const after = sim?.value?.accounts?.[0]?.lamports;
  if (
    !Number.isSafeInteger(after) ||
    !Number.isSafeInteger(fee?.value) ||
    after > balance.value
  )
    throw new Error("Launch cost could not be verified.");
  const now = Date.now();
  const prepared: PreparedLaunch = {
    id: randomUUID(),
    wallet: c.wallet,
    mint: a.mint,
    name: a.name,
    symbol: a.symbol,
    description: a.description,
    image: imageUrl,
    metadataUri: uri,
    transaction: encoded,
    messageHash: launchMessageHash(tx),
    createdAt: now,
    expiresAt: now + 60_000,
    lastValidBlockHeight: latest.value.lastValidBlockHeight,
    estimatedCostLamports: balance.value - after,
    networkFeeLamports: fee.value,
    totalSupply: global.tokenTotalSupply.toString(),
  };
  await writePrivate(`prepared/${prepared.id}.json`, prepared);
  return prepared;
}
export async function reconcileLaunch(id: string) {
  const stored = await readPrivate<PreparedLaunch>(`prepared/${id}.json`);
  if (!stored) throw new Error("Launch not found.");
  const p = stored.value;
  if (!p.signature)
    return {
      status: Date.now() >= p.expiresAt ? "expired" : "awaiting-approval",
      mint: p.mint,
    };
  if (p.status && ["confirmed", "failed", "expired"].includes(p.status))
    return { status: p.status, signature: p.signature, mint: p.mint };
  const result = await rpc("getTransaction", [
    p.signature,
    {
      encoding: "base64",
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    },
  ]);
  async function finish(status: "failed" | "expired") {
    await mutateCommunity((state) => {
      state.pendingLaunches = (state.pendingLaunches || []).filter(
        (item) => item !== id,
      );
    });
    await writePrivate(`prepared/${id}.json`, { ...p, status }, stored!.etag);
    return { status, signature: p.signature, mint: p.mint };
  }
  if (result?.meta?.err) return finish("failed");
  if (!confirmedLaunchTransaction(p, result)) {
    if (
      !result &&
      (await rpc("getBlockHeight", [{ commitment: "finalized" }])) >
        p.lastValidBlockHeight
    )
      return finish("expired");
    return { status: "submitted", signature: p.signature, mint: p.mint };
  }
  const record: LaunchRecord = {
    id: p.id,
    wallet: p.wallet,
    mint: p.mint,
    name: p.name,
    symbol: p.symbol,
    description: p.description,
    image: p.image,
    metadataUri: p.metadataUri,
    signature: p.signature,
    createdAt: result.blockTime * 1000,
  };
  await mutateCommunity((state) => {
    if (!state.launches.some((l) => l.mint === p.mint))
      state.launches.unshift(record);
    state.pendingLaunches = (state.pendingLaunches || []).filter(
      (item) => item !== id,
    );
  });
  await writePrivate(
    `prepared/${id}.json`,
    { ...p, status: "confirmed" },
    stored.etag,
  );
  return { status: "confirmed", signature: p.signature, mint: p.mint };
}
