import "server-only";
import { cached, fetchJSON, jupiterHeaders } from "./server";
import {
  TOKENS,
  type Token,
  type Market,
  type Candle,
  type PoolTrade,
} from "./tokens";
export async function searchTokens(query: string): Promise<Token[]> {
  if (!query.trim()) return TOKENS;
  return cached(`tokens:${query.toLowerCase()}`, 120, async () => {
    const tokens = await fetchJSON<any[]>(
      `https://api.jup.ag/tokens/v2/search?query=${encodeURIComponent(query)}`,
      { headers: jupiterHeaders() },
    );
    return tokens
      .slice(0, 20)
      .filter((t) => typeof t.id === "string" && Number.isInteger(t.decimals))
      .map((t) => ({
        address: t.id,
        name: t.name,
        symbol: t.symbol,
        decimals: t.decimals,
        icon: TOKENS.find((known) => known.address === t.id)?.icon || t.icon,
        verified: t.isVerified === true,
      }));
  });
}
export async function getToken(mint: string): Promise<Token> {
  const known = TOKENS.find((t) => t.address === mint);
  if (known) return known;
  const token = (await searchTokens(mint)).find((t) => t.address === mint);
  if (!token) throw new Error("Token metadata is not available.");
  return token;
}
export async function getMarket(token: Token): Promise<Market | null> {
  return cached(`market:${token.address}`, 30, async () => {
    const pairs = await fetchJSON<any[]>(
      `https://api.dexscreener.com/token-pairs/v1/solana/${token.address}`,
    );
    const p = pairs
      .filter((p) => p.baseToken.address === token.address && p.priceUsd)
      .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    if (!p) return null;
    return {
      token,
      price: Number(p.priceUsd),
      change: p.priceChange?.h24 || 0,
      volume: p.volume?.h24 || 0,
      liquidity: p.liquidity?.usd || 0,
      marketCap: p.marketCap ?? null,
      fdv: p.fdv ?? null,
      pool: p.pairAddress,
      dex: p.dexId,
      quote: p.quoteToken.symbol,
      buys: p.txns?.h24?.buys || 0,
      sells: p.txns?.h24?.sells || 0,
      url: p.url,
      updatedAt: new Date().toISOString(),
    };
  });
}
export async function getCandles(
  pool: string,
  interval: string,
): Promise<Candle[]> {
  const frames: Record<string, [string, number]> = {
    "5m": ["minute", 5],
    "15m": ["minute", 15],
    "1h": ["hour", 1],
    "4h": ["hour", 4],
    "1D": ["day", 1],
  };
  const [frame, aggregate] = frames[interval] || frames["1h"];
  return cached(`candles:${pool}:${interval}`, 45, async () => {
    const result = await fetchJSON(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/${frame}?aggregate=${aggregate}&limit=160&currency=usd&token=base`,
      { headers: { Accept: "application/json;version=20230302" } },
    );
    const candles = result.data?.attributes?.ohlcv_list || [];
    return candles
      .map((c: number[]) => ({
        time: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5],
      }))
      .filter((c: Candle) => Object.values(c).every(Number.isFinite))
      .sort((a: Candle, b: Candle) => a.time - b.time);
  });
}
export async function getTrades(pool: string): Promise<PoolTrade[]> {
  return cached(`trades:${pool}`, 30, async () => {
    const result = await fetchJSON(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/trades`,
      { headers: { Accept: "application/json;version=20230302" } },
    );
    return (result.data || [])
      .slice(0, 30)
      .map((t: any) => ({
        hash: t.attributes.tx_hash,
        side: t.attributes.kind,
        price: Number(t.attributes.price_to_in_usd),
        volume: Number(t.attributes.volume_in_usd),
        time: t.attributes.block_timestamp,
      }));
  });
}
