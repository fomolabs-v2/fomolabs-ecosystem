import { NextRequest, NextResponse } from "next/server";
import { getCandles, getTrades } from "@/lib/market-data";
import { failure, rateLimit } from "@/lib/server";
import { validAddress } from "@/lib/validation";
export async function GET(req: NextRequest) {
  try {
    rateLimit(req, "chart");
    const pool = req.nextUrl.searchParams.get("pool") || "";
    if (!validAddress(pool))
      return failure(new Error("Invalid pool address."), 400);
    if (req.nextUrl.searchParams.get("kind") === "trades")
      return NextResponse.json({
        trades: await getTrades(pool),
        source: "GeckoTerminal",
      });
    return NextResponse.json({
      candles: await getCandles(
        pool,
        req.nextUrl.searchParams.get("interval") || "1h",
      ),
      source: "GeckoTerminal",
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return failure(e);
  }
}
