import { NextRequest, NextResponse } from "next/server";
import { getDexVolume } from "@/lib/volume-store";
import { rateLimit } from "@/lib/server";

export async function GET(req: NextRequest) {
  try {
    rateLimit(req, "volume", 30);
    return NextResponse.json(await getDexVolume(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "FOMO DEX volume is temporarily unavailable. Please retry." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
