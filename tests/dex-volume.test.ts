import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  aggregateVolume,
  confirmedReceipt,
  DAY_MS,
  makeTrackedOrder,
  validateVolumeSubmission,
  type VolumeLedger,
  type VolumeReceipt,
} from "../src/lib/dex-volume";

const now = 1_793_000_000_000;
function fixture() {
  const payer = Keypair.generate();
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: SystemProgram.programId.toBase58(),
      instructions: [],
    }).compileToV0Message(),
  );
  const order = makeTrackedOrder(
    {
      requestId: "test-request-1",
      transaction: Buffer.from(tx.serialize()).toString("base64"),
      inAmount: "1000000",
      inUsdValue: 100,
      swapMode: "ExactIn",
    },
    now,
    now + 30000,
  );
  tx.sign([payer]);
  const signature = validateVolumeSubmission(order, tx, now + 100);
  const receipt: VolumeReceipt = {
    ...order,
    signature,
    submittedAt: now + 100,
    status: "pending",
  };
  return { tx, order, receipt };
}

test("volume tracking requires the server-issued message, unexpired quote, and real payer signature", () => {
  const { tx, order } = fixture();
  assert.throws(
    () => validateVolumeSubmission(order, tx, now + 30000),
    /expired/,
  );
  tx.signatures[0][0] ^= 1;
  assert.throws(
    () => validateVolumeSubmission(order, tx, now),
    /wallet approval/,
  );
  tx.message.recentBlockhash = Keypair.generate().publicKey.toBase58();
  assert.throws(
    () => validateVolumeSubmission(order, tx, now),
    /does not match/,
  );
});

test("failed, pending, and unrelated executions never count; confirmed USD comes from actual input", () => {
  const { receipt } = fixture();
  assert.equal(
    confirmedReceipt(
      receipt,
      { status: "Failed", code: 0, signature: receipt.signature },
      now,
    ),
    null,
  );
  assert.equal(
    confirmedReceipt(
      receipt,
      { status: "Success", code: 1, signature: receipt.signature },
      now,
    ),
    null,
  );
  assert.equal(
    confirmedReceipt(
      receipt,
      { status: "Success", code: 0, signature: "different" },
      now,
    ),
    null,
  );
  const confirmed = confirmedReceipt(
    receipt,
    {
      status: "Success",
      code: 0,
      signature: receipt.signature,
      totalInputAmount: "500000",
    },
    now + 200,
  )!;
  assert.equal(confirmed.usdMicros, "50000000");
});

test("rolling 24h aggregation excludes old/future/failed trades and deduplicates signatures", () => {
  const { receipt } = fixture();
  const ledger: VolumeLedger = {
    version: 1,
    trackingSince: now - DAY_MS * 3,
    receipts: {},
  };
  const confirmed = confirmedReceipt(
    receipt,
    {
      status: "Success",
      code: 0,
      signature: receipt.signature,
      totalInputAmount: "1000000",
    },
    now,
  )!;
  ledger.receipts[receipt.signature] = confirmed;
  ledger.receipts[receipt.signature] = confirmed;
  ledger.receipts.old = { ...confirmed, confirmedAt: now - DAY_MS - 1 };
  ledger.receipts.future = { ...confirmed, confirmedAt: now + 1 };
  ledger.receipts.failed = { ...receipt, status: "failed" };
  ledger.receipts.pending = receipt;
  const result = aggregateVolume(ledger, now);
  assert.equal(result.swaps, 1);
  assert.equal(result.volumeUsd, 100);
  assert.equal(
    result.buckets.reduce((total, b) => total + b.usd, 0),
    100,
  );
  assert.equal(result.fullWindow, true);
});

test("missing pricing remains unavailable rather than counting a fabricated zero", () => {
  const { receipt } = fixture();
  const unpriced = confirmedReceipt(
    receipt,
    { status: "Success", code: 0, signature: receipt.signature },
    now,
  )!;
  const data = aggregateVolume(
    {
      version: 1,
      trackingSince: now,
      receipts: { [receipt.signature]: unpriced },
    },
    now,
  );
  assert.equal(data.swaps, 1);
  assert.equal(data.unpriced, 1);
  assert.equal(data.volumeUsd, null);
  assert.equal(data.fullWindow, false);
});
