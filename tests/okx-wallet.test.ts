import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  Keypair,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  OkxWalletAdapter,
  type OkxSolanaProvider,
} from "../src/lib/okx-wallet";
import { walletBrowseLink } from "../src/lib/wallet-options";
test("OKX connects, reflects account changes, signs only on request, and removes listeners on disconnect", async () => {
  const events = new EventEmitter();
  let signatures = 0;
  const payer = Keypair.generate();
  const provider = {
    publicKey: payer.publicKey,
    connect: async () => ({ publicKey: payer.publicKey }),
    disconnect: async () => {},
    signTransaction: async <T>(tx: T) => {
      signatures++;
      return tx;
    },
    on: events.on.bind(events),
    removeListener: events.removeListener.bind(events),
  } as OkxSolanaProvider;
  const adapter = new OkxWalletAdapter(() => provider);
  await adapter.connect();
  assert.ok(adapter.publicKey?.equals(payer.publicKey));
  assert.equal(signatures, 0);
  const replacement = Keypair.generate().publicKey;
  events.emit("accountChanged", replacement);
  assert.ok(adapter.publicKey?.equals(replacement));
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: replacement,
      recentBlockhash: SystemProgram.programId.toBase58(),
      instructions: [],
    }).compileToV0Message(),
  );
  assert.equal(await adapter.signTransaction(tx), tx);
  assert.equal(signatures, 1);
  await adapter.disconnect();
  assert.equal(adapter.publicKey, null);
  assert.equal(events.listenerCount("accountChanged"), 0);
  assert.equal(events.listenerCount("disconnect"), 0);
  await assert.rejects(() => adapter.signTransaction(tx));
});
test("wallet browse links preserve token selection but exclude arbitrary private parameters", () => {
  const source =
    "https://fomolabs-ecosystem.vercel.app/trade?token=So11111111111111111111111111111111111111112&secret=not-for-sharing#private";
  for (const name of ["Phantom", "Solflare"]) {
    const result = walletBrowseLink(name, source)!;
    assert.ok(result.startsWith("https://"));
    assert.ok(decodeURIComponent(result).includes("token=So111"));
    assert.ok(!result.includes("secret"));
    assert.ok(!result.includes("private"));
  }
  assert.equal(walletBrowseLink("Unknown", source), null);
  assert.equal(walletBrowseLink("Phantom", "javascript:alert(1)"), null);
});
