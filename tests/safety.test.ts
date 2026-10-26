import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import sharp from "sharp";
import {
  atomicAmount,
  decimalAmount,
  validAddress,
  validateOrderParams,
} from "../src/lib/validation";
import { FOMO, SOL, USDC } from "../src/lib/tokens";
test("converts exact token amounts without floating point rounding", () => {
  assert.equal(atomicAmount("0.000000001", 9), "1");
  assert.equal(atomicAmount("9007199.254740993", 9), "9007199254740993");
  assert.equal(atomicAmount("2.500000", 6), "2500000");
});
test("rejects negative, exponential, nonfinite, excessive precision and overflow amounts", () => {
  for (const value of [
    "-1",
    "1e3",
    "NaN",
    "Infinity",
    "0",
    "0.0000000001",
    "18446744073709551616",
  ])
    assert.throws(() => atomicAmount(value, 9));
});
test("formats atomic values without losing low-value token precision", () => {
  assert.equal(decimalAmount("1", 9), "0.000000001");
  assert.equal(decimalAmount("100000000000", 9), "100");
  assert.equal(decimalAmount("1200", 0), "1200");
  assert.equal(decimalAmount("1234567", 6), "1.234567");
});
test("accepts the user supplied FOMO mint and rejects malformed addresses", () => {
  assert.equal(validAddress(FOMO), true);
  assert.equal(validAddress("not-a-mint"), false);
  assert.equal(validAddress(null), false);
});
test("enforces different valid tokens, atomic limits, slippage bounds and a valid taker", () => {
  assert.doesNotThrow(() => validateOrderParams(SOL, USDC, "1000000", 50));
  for (const slip of [-1, 0, 9, 301, 10000, NaN, 50.5])
    assert.throws(() => validateOrderParams(SOL, USDC, "1000000", slip));
  assert.throws(() => validateOrderParams(SOL, SOL, "1000000", 50));
  assert.throws(() => validateOrderParams(SOL, USDC, "0", 50));
  assert.throws(() => validateOrderParams(SOL, USDC, "-1", 50));
  assert.throws(() =>
    validateOrderParams(SOL, USDC, "18446744073709551616", 50),
  );
  assert.throws(() => validateOrderParams(SOL, USDC, "1", 50, "bad-wallet"));
});
test("PWA install icons match their declared dimensions", async () => {
  const manifest = JSON.parse(
    readFileSync("public/manifest.webmanifest", "utf8"),
  );
  assert.equal(manifest.display, "standalone");
  assert.ok(
    manifest.icons.some((i: { sizes: string }) => i.sizes === "192x192"),
  );
  assert.ok(
    manifest.icons.some((i: { sizes: string }) => i.sizes === "512x512"),
  );
  for (const icon of manifest.icons) { const metadata = await sharp(`public${icon.src}`).metadata(); assert.equal(`${metadata.width}x${metadata.height}`, icon.sizes); }
});
test("service worker bypasses wallet and trading data and serves an offline navigation fallback", async () => {
  const handlers: Record<string, (event: any) => void> = {};
  const cacheReads: string[] = [];
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL,
    self: { location: { origin: 'https://fomo.test' }, addEventListener: (event: string, handler: any) => { handlers[event] = handler; } },
    fetch: async () => { throw new Error('offline'); },
    caches: { match: async (url: string) => { cacheReads.push(url); return 'offline-page'; } },
  });
  let intercepted = false;
  for (const path of ['/api/wallet?address=example','/api/order','/api/execute']) handlers.fetch({ request: { url: `https://fomo.test${path}`, method: 'GET', mode: 'cors' }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false); assert.deepEqual(cacheReads, []);
  let response: Promise<string> | undefined;
  handlers.fetch({ request: { url: 'https://fomo.test/trade', method: 'GET', mode: 'navigate' }, respondWith: (value: Promise<string>) => { response = value; } });
  assert.equal(await response, 'offline-page'); assert.deepEqual(cacheReads, ['/offline.html']);
});
