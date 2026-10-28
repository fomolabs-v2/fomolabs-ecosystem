import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizedChallenge } from "@/lib/community-store";
import { prepareLaunch } from "@/lib/launch-store";
import {
  boundedJSON,
  communityError,
  requestOrigin,
} from "@/lib/community-http";
import { rateLimit } from "@/lib/server";
export async function POST(req: NextRequest) {
  try {
    const origin = requestOrigin(req);
    rateLimit(req, "launch-prepare", 6);
    const input = z
      .object({
        id: z.string().uuid(),
        signature: z.string().max(100),
        image: z.string().max(2_000_000),
      })
      .strict()
      .parse(await boundedJSON(req, 2_100_000));
    const c = await authorizedChallenge(input.id, input.signature, origin);
    return NextResponse.json(await prepareLaunch(c, input.image), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return communityError(error);
  }
}
