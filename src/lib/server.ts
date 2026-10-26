import "server-only";
import { NextRequest, NextResponse } from "next/server";
type Entry = { value: unknown; expires: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const limits = new Map<string, { count: number; reset: number }>();
export async function cached<T>(
  key: string,
  seconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const task = fetcher()
    .then((value) => {
      if (cache.size > 500) cache.clear();
      cache.set(key, { value, expires: Date.now() + seconds * 1000 });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, task);
  return task;
}
export async function fetchJSON<T = any>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
    headers: { Accept: "application/json", ...init.headers },
  });
  if (!res.ok)
    throw new Error(
      res.status === 429
        ? "The data provider is busy. Please try again shortly."
        : `The data provider is temporarily unavailable (${res.status}).`,
    );
  return res.json();
}
export const jupiterHeaders = (): Record<string, string> =>
  process.env.JUPITER_API_KEY
    ? { "x-api-key": process.env.JUPITER_API_KEY }
    : {};
let nextJupiterAt = 0;
export function jupiterBudget() {
  if (process.env.JUPITER_API_KEY) return;
  if (Date.now() < nextJupiterAt)
    throw new Error("Quote service is busy. Please retry in a few seconds.");
  nextJupiterAt = Date.now() + 2100;
}
export function rateLimit(req: NextRequest, scope: string, max = 45) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${scope}:${ip}`,
    now = Date.now();
  if (limits.size > 4000)
    for (const [k, v] of limits) if (v.reset < now) limits.delete(k);
  const entry = limits.get(key);
  if (!entry || entry.reset <= now) {
    limits.set(key, { count: 1, reset: now + 60000 });
    return;
  }
  if (++entry.count > max)
    throw new Error("Too many requests. Please wait a minute.");
}
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (
    origin &&
    origin !== req.nextUrl.origin &&
    new URL(origin).host !== req.headers.get("host")
  )
    throw new Error("Cross-origin request rejected.");
}
export function failure(error: unknown, status = 503) {
  const message =
    error instanceof Error ? error.message : "Service temporarily unavailable.";
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export async function rpc(method: string, params: unknown[] = []) {
  const urls = [
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    process.env.SOLANA_RPC_FALLBACK_URL || "https://solana-rpc.publicnode.com",
  ].filter(Boolean) as string[];
  for (let i = 0; i < urls.length; i++) {
    try {
      const body = await fetchJSON(urls[i], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (body.error)
        throw new Error("Solana network data is temporarily unavailable.");
      return body.result;
    } catch (e) {
      if (i === urls.length - 1) throw e;
    }
  }
}
