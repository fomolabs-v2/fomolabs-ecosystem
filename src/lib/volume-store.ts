import "server-only";
import { createHash } from "node:crypto";
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { VersionedTransaction } from "@solana/web3.js";
import {
  aggregateVolume,
  confirmedReceipt,
  DAY_MS,
  messageHash,
  validateVolumeSubmission,
  type TrackedOrder,
  type VolumeLedger,
  type VolumeReceipt,
} from "./dex-volume";
import { cached, rpc } from "./server";

const ROOT = "fomolabs-volume-v1";
const ledgerPath = `${ROOT}/ledger.json`;
const orderPath = (id: string) =>
  `${ROOT}/orders/${createHash("sha256").update(id).digest("hex")}.json`;
const writeOptions = {
  access: "private" as const,
  addRandomSuffix: false,
  contentType: "application/json",
  cacheControlMaxAge: 60,
};

async function readJSON<T>(path: string) {
  const result = await get(path, { access: "private", useCache: false });
  if (!result) return null;
  if (result.statusCode !== 200 || !result.stream)
    throw new Error("Volume storage is unavailable.");
  return {
    value: (await new Response(result.stream).json()) as T,
    etag: result.blob.etag,
  };
}

async function loadLedger() {
  const existing = await readJSON<VolumeLedger>(ledgerPath);
  if (existing) return existing;
  const initial: VolumeLedger = {
    version: 1,
    trackingSince: Date.now(),
    receipts: {},
  };
  try {
    const created = await put(ledgerPath, JSON.stringify(initial), {
      ...writeOptions,
      allowOverwrite: false,
    });
    return { value: initial, etag: created.etag };
  } catch (error) {
    const raced = await readJSON<VolumeLedger>(ledgerPath);
    if (raced) return raced;
    throw error;
  }
}

async function updateLedger(change: (ledger: VolumeLedger) => void) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await loadLedger();
    const cutoff = Date.now() - 2 * DAY_MS;
    for (const [key, receipt] of Object.entries(current.value.receipts))
      if ((receipt.confirmedAt ?? receipt.submittedAt) < cutoff)
        delete current.value.receipts[key];
    change(current.value);
    if (Object.keys(current.value.receipts).length > 5000)
      throw new Error(
        "Trade reporting is at capacity. Please try again later.",
      );
    try {
      await put(ledgerPath, JSON.stringify(current.value), {
        ...writeOptions,
        allowOverwrite: true,
        ifMatch: current.etag,
      });
      return current.value;
    } catch (error) {
      if (!(error instanceof BlobPreconditionFailedError) || attempt === 7)
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }
  throw new Error("Trade reporting is busy. Please retry.");
}

export async function saveTrackedOrder(order: TrackedOrder) {
  await loadLedger();
  await put(orderPath(order.requestId), JSON.stringify(order), {
    ...writeOptions,
    allowOverwrite: true,
  });
}

export async function beginTrackedExecution(
  requestId: string,
  tx: VersionedTransaction,
) {
  const stored = await readJSON<TrackedOrder>(orderPath(requestId));
  if (!stored || stored.value.requestId !== requestId)
    throw new Error("Please request a fresh FOMO DEX quote before approving.");
  const now = Date.now();
  const signature = validateVolumeSubmission(stored.value, tx, now);
  const receipt: VolumeReceipt = {
    ...stored.value,
    signature,
    submittedAt: now,
    status: "pending",
  };
  const ledger = await updateLedger((value) => {
    if (!value.receipts[signature]) value.receipts[signature] = receipt;
  });
  return ledger.receipts[signature];
}

export async function finishTrackedExecution(
  receipt: VolumeReceipt,
  result: Parameters<typeof confirmedReceipt>[1],
) {
  const confirmed = confirmedReceipt(receipt, result, Date.now());
  if (!confirmed) return;
  await updateLedger((ledger) => {
    if (ledger.receipts[receipt.signature]?.status !== "confirmed")
      ledger.receipts[receipt.signature] = confirmed;
  });
}

async function reconcilePending(ledger: VolumeLedger) {
  const pending = Object.values(ledger.receipts)
    .filter(
      (r) => r.status === "pending" && r.submittedAt > Date.now() - DAY_MS,
    )
    .sort((a, b) => (a.lastCheckedAt ?? 0) - (b.lastCheckedAt ?? 0))
    .slice(0, 3);
  if (!pending.length) return ledger;
  const changes: VolumeReceipt[] = [];
  // A pending receipt exists before submission, so timeouts and restarts cannot
  // erase a swap. Reconcile only the signed message issued by this application.
  for (let i = 0; i < pending.length; i += 3) {
    const results = await Promise.allSettled(
      pending.slice(i, i + 3).map(async (receipt) => {
        const result = await rpc("getTransaction", [
          receipt.signature,
          {
            encoding: "base64",
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          },
        ]);
        if (!result) return null;
        if (result.meta?.err) return { ...receipt, status: "failed" as const };
        if (
          !result.meta ||
          !result.blockTime ||
          !Array.isArray(result.transaction)
        )
          return null;
        const tx = VersionedTransaction.deserialize(
          Buffer.from(result.transaction[0], "base64"),
        );
        if (messageHash(tx) !== receipt.messageHash) return null;
        // ExactIn was enforced when the server recorded this order. The USD
        // conversion remains the provider's execution-time quote estimate.
        return {
          ...receipt,
          status: "confirmed" as const,
          confirmedAt: result.blockTime * 1000,
          usdMicros: receipt.inputUsdMicros,
        };
      }),
    );
    results.forEach((result, index) => {
      const receipt = result.status === "fulfilled" && result.value ? result.value : pending[i + index];
      changes.push({ ...receipt, lastCheckedAt: Date.now() });
    });
  }
  if (!changes.length) return ledger;
  return updateLedger((current) => {
    for (const receipt of changes)
      if (current.receipts[receipt.signature]?.status === "pending")
        current.receipts[receipt.signature] = receipt;
  });
}

export async function getDexVolume() {
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN)
    throw new Error("FOMO DEX volume is temporarily unavailable.");
  return cached("dex-volume-ledger", 30, async () => {
    const current = await loadLedger();
    return aggregateVolume(await reconcilePending(current.value), Date.now());
  });
}
