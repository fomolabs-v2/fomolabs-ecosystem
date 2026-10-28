import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { VersionedTransaction } from "@solana/web3.js";
import {
  readPrivate,
  writePrivate,
  mutateCommunity,
} from "@/lib/community-store";
import {
  verifyLaunchTransaction,
  type PreparedLaunch,
} from "@/lib/launch-safety";
import { reconcileLaunch } from "@/lib/launch-store";
import {
  boundedJSON,
  communityError,
  requestOrigin,
} from "@/lib/community-http";
import { rateLimit, rpc } from "@/lib/server";
export async function POST(req: NextRequest) {
  try {
    requestOrigin(req);
    rateLimit(req, "launch-execute", 8);
    const input = z
      .object({
        id: z.string().uuid(),
        signedTransaction: z.string().min(1).max(2000),
      })
      .strict()
      .parse(await boundedJSON(req));
    const stored = await readPrivate<PreparedLaunch>(
      `prepared/${input.id}.json`,
    );
    if (!stored) throw new Error("Launch review not found.");
    const tx = VersionedTransaction.deserialize(
      Buffer.from(input.signedTransaction, "base64"),
    );
    const signature = verifyLaunchTransaction(stored.value, tx, Date.now());
    if (stored.value.signature && stored.value.signature !== signature)
      throw new Error("Launch signature mismatch.");
    if (stored.value.status === "confirmed")
      return NextResponse.json({
        status: "confirmed",
        signature,
        mint: stored.value.mint,
      });
    if (!stored.value.signature)
      await writePrivate(
        `prepared/${input.id}.json`,
        { ...stored.value, signature, status: "submitted" },
        stored.etag,
      );
    await mutateCommunity((state) => {
      state.pendingLaunches ||= [];
      if (!state.pendingLaunches.includes(input.id)) {
        if (state.pendingLaunches.length >= 100)
          throw new Error(
            "Launch confirmations are busy. Please retry shortly.",
          );
        state.pendingLaunches.push(input.id);
      }
    });
    try {
      const sent = await rpc("sendTransaction", [
        input.signedTransaction,
        {
          encoding: "base64",
          skipPreflight: false,
          maxRetries: 2,
          preflightCommitment: "confirmed",
        },
      ]);
      if (sent !== signature) throw new Error("Launch signature mismatch.");
    } catch {
      // The node can accept a transaction before its HTTP response is lost.
      // Preserve the signature and reconcile; never label a timeout confirmed.
    }
    return NextResponse.json(
      { status: "submitted", signature, mint: stored.value.mint },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return communityError(error);
  }
}
export async function GET(req: NextRequest) {
  try {
    rateLimit(req, "launch-status", 30);
    const id = z.string().uuid().parse(req.nextUrl.searchParams.get("id"));
    return NextResponse.json(await reconcileLaunch(id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return communityError(error);
  }
}
