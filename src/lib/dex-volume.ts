import { createHash, verify } from "node:crypto";
import { VersionedTransaction } from "@solana/web3.js";

export const DAY_MS = 86_400_000;
export type TrackedOrder = {
  requestId: string;
  messageHash: string;
  inputAmount: string;
  inputUsdMicros: string | null;
  createdAt: number;
  expiresAt: number;
};
export type VolumeReceipt = TrackedOrder & {
  signature: string;
  submittedAt: number;
  lastCheckedAt?: number;
  status: "pending" | "confirmed" | "failed";
  confirmedAt?: number;
  usdMicros?: string | null;
};
export type VolumeLedger = {
  version: 1;
  trackingSince: number;
  receipts: Record<string, VolumeReceipt>;
};

export function messageHash(transaction: VersionedTransaction) {
  return createHash("sha256")
    .update(transaction.message.serialize())
    .digest("hex");
}

export function signatureBase58(bytes: Uint8Array): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let value = BigInt(`0x${Buffer.from(bytes).toString("hex")}`);
  let encoded = "";
  while (value > 0n) {
    encoded = alphabet[Number(value % 58n)] + encoded;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    encoded = "1" + encoded;
  }
  return encoded;
}

export function makeTrackedOrder(
  order: {
    requestId: string;
    transaction: string;
    inAmount: string;
    inUsdValue?: number;
    swapMode?: string;
  },
  now: number,
  expiresAt: number,
): TrackedOrder {
  if (
    !order.requestId ||
    !/^\d+$/.test(order.inAmount) ||
    BigInt(order.inAmount) <= 0n ||
    order.swapMode !== "ExactIn"
  )
    throw new Error("Please request a new exact-input quote.");
  const transaction = VersionedTransaction.deserialize(
    Buffer.from(order.transaction, "base64"),
  );
  const usd = order.inUsdValue;
  const micros =
    typeof usd === "number" && Number.isFinite(usd) && usd > 0
      ? Math.round(usd * 1_000_000)
      : NaN;
  return {
    requestId: order.requestId,
    messageHash: messageHash(transaction),
    inputAmount: order.inAmount,
    inputUsdMicros: Number.isSafeInteger(micros) ? String(micros) : null,
    createdAt: now,
    expiresAt,
  };
}

export function validateVolumeSubmission(
  order: TrackedOrder,
  transaction: VersionedTransaction,
  now: number,
) {
  if (now >= order.expiresAt || now < order.createdAt - 5000)
    throw new Error("Quote expired. Please request a new review.");
  if (messageHash(transaction) !== order.messageHash)
    throw new Error(
      "The signed transaction does not match the reviewed quote.",
    );
  const signature = transaction.signatures[0];
  const publicKey = transaction.message.staticAccountKeys[0];
  if (
    !signature ||
    !publicKey ||
    !verify(
      null,
      transaction.message.serialize(),
      {
        key: Buffer.concat([
          Buffer.from("302a300506032b6570032100", "hex"),
          publicKey.toBuffer(),
        ]),
        format: "der",
        type: "spki",
      },
      signature,
    )
  )
    throw new Error("Valid wallet approval is required.");
  return signatureBase58(signature);
}

export function confirmedReceipt(
  receipt: VolumeReceipt,
  result: {
    status?: string;
    code?: number;
    signature?: string;
    totalInputAmount?: string;
  },
  now: number,
): VolumeReceipt | null {
  if (
    result.status !== "Success" ||
    result.code !== 0 ||
    result.signature !== receipt.signature
  )
    return null;
  const actual = result.totalInputAmount;
  // No client-provided USD amount is accepted. Use the server-issued quote's price
  // with the provider-confirmed input amount; missing pricing stays unpriced.
  const usdMicros =
    receipt.inputUsdMicros !== null &&
    typeof actual === "string" &&
    /^\d+$/.test(actual) &&
    BigInt(actual) > 0n
      ? (
          (BigInt(receipt.inputUsdMicros) * BigInt(actual)) /
          BigInt(receipt.inputAmount)
        ).toString()
      : null;
  return { ...receipt, status: "confirmed", confirmedAt: now, usdMicros };
}

export function aggregateVolume(ledger: VolumeLedger, now: number) {
  const start = now - DAY_MS;
  const buckets = Array.from({ length: 24 }, (_, index) => ({
    start: start + index * 3_600_000,
    usd: 0,
    swaps: 0,
  }));
  let totalMicros = 0n,
    swaps = 0,
    unpriced = 0,
    pending = 0;
  for (const receipt of Object.values(ledger.receipts)) {
    if (
      receipt.status === "pending" &&
      receipt.submittedAt >= start &&
      receipt.submittedAt <= now
    )
      pending++;
    if (
      receipt.status !== "confirmed" ||
      receipt.confirmedAt == null ||
      receipt.confirmedAt < start ||
      receipt.confirmedAt > now
    )
      continue;
    swaps++;
    const bucket =
      buckets[
        Math.min(23, Math.floor((receipt.confirmedAt - start) / 3_600_000))
      ];
    bucket.swaps++;
    if (receipt.usdMicros == null) {
      unpriced++;
      continue;
    }
    const amount = BigInt(receipt.usdMicros);
    totalMicros += amount;
    bucket.usd += Number(amount) / 1_000_000;
  }
  return {
    volumeUsd: unpriced ? null : Number(totalMicros) / 1_000_000,
    pricedVolumeUsd: Number(totalMicros) / 1_000_000,
    swaps,
    unpriced,
    pending,
    buckets,
    trackingSince: ledger.trackingSince,
    fullWindow: ledger.trackingSince <= start,
    updatedAt: now,
  };
}
