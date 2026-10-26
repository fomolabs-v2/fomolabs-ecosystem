import { NextRequest, NextResponse } from "next/server";
import { getMarket, getToken } from "@/lib/market-data";
import { TOKENS } from "@/lib/tokens";
import { failure, rateLimit } from "@/lib/server";
import { validAddress } from "@/lib/validation";
export async function GET(req: NextRequest) {
  try {
    rateLimit(req, "markets");
    const mint = req.nextUrl.searchParams.get("mint");
    if (mint && !validAddress(mint))
      return failure(new Error("Invalid mint."), 400);
    const tokens = mint ? [await getToken(mint)] : TOKENS;
    const results = await Promise.allSettled(tokens.map(getMarket));
    const markets = results.flatMap((r) =>
      r.status === "fulfilled" && r.value ? [r.value] : [],
    );
    if (!markets.length)
      return failure(
        new Error("Market data is unavailable. Please refresh shortly."),
      );
    return NextResponse.json({
      markets,
      partial: results.some((r) => r.status === "rejected" || !r.value),
      source: "DEX Screener",
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return failure(e);
  }
}
