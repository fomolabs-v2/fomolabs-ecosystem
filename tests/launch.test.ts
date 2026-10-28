import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Keypair, SystemProgram, VersionedTransaction } from "@solana/web3.js";
import {
  buildLaunchTransaction,
  confirmedLaunchTransaction,
  launchMessageHash,
  verifyLaunchTransaction,
  type PreparedLaunch,
} from "../src/lib/launch-safety";
import { sameMessage, validateLaunchMessage } from "../src/lib/launch-client";
import {
  toBigIntLE,
  toBigIntBE,
  toBufferLE,
  toBufferBE,
} from "../vendor/bigint-buffer/index.cjs";
test("official Pump creation has only two signers and requires both approvals of the exact reviewed bytes", async () => {
  const payer = Keypair.generate(),
    mint = Keypair.generate(),
    now = Date.now();
  const tx = await buildLaunchTransaction({
    wallet: payer.publicKey.toBase58(),
    mint: mint.publicKey.toBase58(),
    name: "Launch safety test",
    symbol: "QA",
    uri: "https://www.fomolabs.world/api/launch/metadata/test",
    blockhash: SystemProgram.programId.toBase58(),
  });
  const p = {
    id: randomUUID(),
    wallet: payer.publicKey.toBase58(),
    mint: mint.publicKey.toBase58(),
    messageHash: launchMessageHash(tx),
    expiresAt: now + 60000,
  } as PreparedLaunch;
  assert.ok(tx.serialize().length <= 1232);
  validateLaunchMessage(tx, p.wallet, p.mint);
  assert.throws(() => verifyLaunchTransaction(p, tx, now), /approvals/);
  tx.sign([mint]);
  assert.throws(() => verifyLaunchTransaction(p, tx, now), /approvals/);
  tx.sign([payer]);
  p.signature = verifyLaunchTransaction(p, tx, now);
  assert.ok(p.signature.length > 80);
  assert.throws(() => verifyLaunchTransaction(p, tx, p.expiresAt), /expired/);
  assert.throws(() =>
    validateLaunchMessage(tx, mint.publicKey.toBase58(), p.mint),
  );
  const changed = VersionedTransaction.deserialize(tx.serialize());
  changed.message.recentBlockhash = Keypair.generate().publicKey.toBase58();
  assert.equal(
    sameMessage(tx.message.serialize(), changed.message.serialize()),
    false,
  );
  assert.throws(
    () => verifyLaunchTransaction(p, changed, now),
    /does not match/,
  );
  const good = {
    meta: { err: null },
    blockTime: now / 1000,
    transaction: [Buffer.from(tx.serialize()).toString("base64"), "base64"],
  };
  assert.equal(confirmedLaunchTransaction(p, good), true);
  for (const result of [
    null,
    { status: "success", signature: p.signature },
    { ...good, meta: { err: { InstructionError: [0, 1] } } },
    {
      ...good,
      transaction: [
        Buffer.from(changed.serialize()).toString("base64"),
        "base64",
      ],
    },
  ])
    assert.equal(confirmedLaunchTransaction(p, result), false);
});
test("bounded pure JS integer conversion covers SPL widths without native code or overflow", () => {
  for (const width of [0, 1, 2, 4, 8, 16, 32])
    for (const value of width
      ? [0n, 1n, (1n << BigInt(width * 8)) - 1n]
      : [0n]) {
      assert.equal(toBigIntLE(toBufferLE(value, width)), value);
      assert.equal(toBigIntBE(toBufferBE(value, width)), value);
      assert.deepEqual(
        toBufferLE(value, width),
        toBufferBE(value, width).reverse(),
      );
    }
  for (const width of [-1, NaN, Infinity, 65537, 1.5])
    assert.throws(() => toBufferLE(0n, width));
  assert.throws(() => toBufferLE(256n, 1));
  assert.throws(() => toBufferBE(-1n, 8));
  assert.throws(() => toBigIntLE(new Uint8Array(1) as Buffer));
});
