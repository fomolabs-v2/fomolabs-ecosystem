import { NextRequest, NextResponse } from "next/server";
import { tokenHolding } from "@/lib/community-store";
import { communityError } from "@/lib/community-http";
import { validAddress } from "@/lib/validation";
import { rateLimit } from "@/lib/server";
export async function GET(req: NextRequest) {
  try {
    rateLimit(req, "community-holding", 30);
    const wallet = req.nextUrl.searchParams.get("wallet"),
      mint = req.nextUrl.searchParams.get("mint");
    if (!validAddress(wallet) || !validAddress(mint))
      throw new Error("Invalid wallet or token.");
    const holding = await tokenHolding(wallet, mint);
    return NextResponse.json(
      { eligible: holding.eligible, checkedAt: holding.checkedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return communityError(error);
  }
}
