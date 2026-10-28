import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { communityAction } from "@/lib/community";
import { createChallenge } from "@/lib/community-store";
import {
  boundedJSON,
  communityError,
  requestOrigin,
} from "@/lib/community-http";
import { rateLimit } from "@/lib/server";
import { validAddress } from "@/lib/validation";
export async function POST(req: NextRequest) {
  try {
    const origin = requestOrigin(req);
    rateLimit(req, "community-challenge", 12);
    const input = z
      .object({
        wallet: z.string().refine(validAddress),
        action: communityAction,
      })
      .strict()
      .parse(await boundedJSON(req));
    return NextResponse.json(
      await createChallenge(input.wallet, origin, input.action),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return communityError(error);
  }
}
