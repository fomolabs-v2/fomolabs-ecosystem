import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Keypair,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  orderExpiry,
  isConfirmedExecution,
  validateReviewedTransaction,
  validateSignedTransaction,
  priceImpactMagnitude,
} from "../src/lib/trade-safety";
test("review expires within 30 seconds and honors earlier provider expiration", () => {
  const now = 1792986000000;
  assert.equal(orderExpiry(now), now + 30000);
  assert.equal(orderExpiry(now, (now + 10000) / 1000), now + 10000);
  assert.equal(orderExpiry(now, String(now + 5000)), now + 5000);
  assert.equal(
    orderExpiry(now, new Date(now + 2000).toISOString()),
    now + 2000,
  );
  assert.equal(orderExpiry(now, "invalid"), now + 30000);
});
test("negative Jupiter price impact cannot bypass risk acknowledgement or the 15 percent block", () => {
  assert.equal(priceImpactMagnitude(-12.5), 12.5);
  assert.ok(priceImpactMagnitude(-20) > 15);
  assert.ok(priceImpactMagnitude(4) > 3);
  assert.equal(priceImpactMagnitude(undefined), Infinity);
  assert.equal(priceImpactMagnitude(NaN), Infinity);
});
test("signed approval cannot change the reviewed message or omit the payer signature", () => {
  const payer = Keypair.generate();
  const original = new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: SystemProgram.programId.toBase58(),
      instructions: [],
    }).compileToV0Message(),
  );
  const encoded = Buffer.from(original.serialize()).toString("base64");
  assert.throws(
    () =>
      validateSignedTransaction(encoded, original, payer.publicKey.toBase58()),
    /approval is missing/,
  );
  original.sign([payer]);
  assert.doesNotThrow(() =>
    validateSignedTransaction(encoded, original, payer.publicKey.toBase58()),
  );
  original.message.recentBlockhash = Keypair.generate().publicKey.toBase58();
  assert.throws(
    () =>
      validateSignedTransaction(encoded, original, payer.publicKey.toBase58()),
    /changed the reviewed transaction/,
  );
});
test("a signature or successful-looking status alone does not confirm execution", () => {
  const signature = "a".repeat(88);
  assert.equal(
    isConfirmedExecution({ status: "Success", code: 0, signature }),
    true,
  );
  assert.equal(
    isConfirmedExecution({ status: "Failed", code: 0, signature }),
    false,
  );
  assert.equal(
    isConfirmedExecution({ status: "Success", code: -1, signature }),
    false,
  );
  assert.equal(isConfirmedExecution({ status: "Success", code: 0 }), false);
});
test("an unsigned transaction must name the connected wallet as payer", () => {
  const owner = Keypair.generate().publicKey,
    other = Keypair.generate().publicKey;
  const message = new TransactionMessage({
    payerKey: owner,
    recentBlockhash: SystemProgram.programId.toBase58(),
    instructions: [],
  }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  const base64 = Buffer.from(transaction.serialize()).toString("base64");
  assert.equal(
    validateReviewedTransaction(
      base64,
      owner.toBase58(),
    ).message.staticAccountKeys[0].toBase58(),
    owner.toBase58(),
  );
  assert.throws(
    () => validateReviewedTransaction(base64, other.toBase58()),
    /wallet does not match/,
  );
});
