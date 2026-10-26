import { NextRequest, NextResponse } from "next/server";
import { searchTokens } from "@/lib/market-data";
import { failure, rateLimit } from "@/lib/server";
export async function GET(req: NextRequest) {
  try {
    rateLimit(req, "tokens", 30);
    const query = (req.nextUrl.searchParams.get("q") || "").slice(0, 100);
    return NextResponse.json({ tokens: await searchTokens(query) });
  } catch (e) {
    return failure(e);
  }
}
