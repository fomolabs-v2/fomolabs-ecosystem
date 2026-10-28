import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyCommunityAction } from "@/lib/community";
import {
  authorizedChallenge,
  mutateCommunity,
  readCommunity,
  tokenHolding,
} from "@/lib/community-store";
import {
  boundedJSON,
  communityError,
  requestOrigin,
} from "@/lib/community-http";
import { getToken } from "@/lib/market-data";
import { rateLimit } from "@/lib/server";
import { validAddress } from "@/lib/validation";
export async function GET(req: NextRequest) {
  try {
    rateLimit(req, "community-read", 45);
    const wallet = req.nextUrl.searchParams.get("wallet"),
      mint = req.nextUrl.searchParams.get("mint");
    if ((wallet && !validAddress(wallet)) || (mint && !validAddress(mint)))
      throw new Error("Invalid wallet or token.");
    let state = await readCommunity();
    if (state.pendingLaunches?.length) {
      // Reconcile a bounded batch on directory reads, even if the creator left.
      const { reconcileLaunch } = await import("@/lib/launch-store");
      await Promise.allSettled(
        state.pendingLaunches.slice(0, 3).map(reconcileLaunch),
      );
      state = await readCommunity();
    }
    const posts = state.callouts.filter(
      (p) =>
        (!wallet || p.wallet === wallet) && (!mint || p.token.address === mint),
    );
    const cursor = req.nextUrl.searchParams.get("before");
    const sorted = posts.sort(
      (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id),
    );
    const [beforeTime, beforeId] = cursor?.split("_") || [];
    if (
      cursor &&
      (!Number.isSafeInteger(Number(beforeTime)) ||
        !z.string().uuid().safeParse(beforeId).success)
    )
      throw new Error("Invalid feed cursor.");
    const filtered = cursor
      ? sorted.filter(
          (p) =>
            p.createdAt < Number(beforeTime) ||
            (p.createdAt === Number(beforeTime) &&
              p.id.localeCompare(beforeId) < 0),
        )
      : sorted;
    const page = filtered.slice(0, 30);
    const authors = Object.fromEntries(
      page.map((p) => [p.wallet, state.profiles[p.wallet]]),
    );
    const last = page.at(-1);
    return NextResponse.json(
      {
        callouts: page,
        profiles: authors,
        profile: wallet ? state.profiles[wallet] || null : null,
        launches: state.launches
          .filter((l) => !wallet || l.wallet === wallet)
          .slice(0, 30),
        next:
          filtered.length > 30 && last ? `${last.createdAt}_${last.id}` : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return communityError(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    const origin = requestOrigin(req);
    rateLimit(req, "community-write", 15);
    const input = z
      .object({ id: z.string().uuid(), signature: z.string().max(100) })
      .strict()
      .parse(await boundedJSON(req));
    const c = await authorizedChallenge(input.id, input.signature, origin);
    if (c.action.kind === "launch")
      throw new Error("Use the launch review before creating a token.");
    const extra =
      c.action.kind === "callout"
        ? {
            token: await getToken(c.action.mint),
            holding: await tokenHolding(c.wallet, c.action.mint),
          }
        : undefined;
    await mutateCommunity((state) => {
      applyCommunityAction(state, c, Date.now(), extra);
    });
    return NextResponse.json(
      { ok: true, id: c.id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return communityError(error);
  }
}
