import { NextRequest, NextResponse } from "next/server";
import { VersionedTransaction } from "@solana/web3.js";
import {
  beginTrackedExecution,
  finishTrackedExecution,
} from "@/lib/volume-store";
import {
  failure,
  fetchJSON,
  jupiterHeaders,
  rateLimit,
  sameOrigin,
} from "@/lib/server";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    rateLimit(req, "execute", 8);
    const raw = await req.text();
    if (raw.length > 12000)
      return failure(new Error("Request too large."), 413);
    const { signedTransaction, requestId } = JSON.parse(raw);
    if (
      typeof requestId !== "string" ||
      !/^[a-zA-Z0-9_-]{10,100}$/.test(requestId) ||
      typeof signedTransaction !== "string" ||
      !/^[A-Za-z0-9+/]+=*$/.test(signedTransaction)
    )
      return failure(new Error("Invalid execution request."), 400);
    const tx = VersionedTransaction.deserialize(
      Buffer.from(signedTransaction, "base64"),
    );
    if (!tx.signatures.length || tx.signatures[0].every((v) => v === 0))
      return failure(new Error("Wallet approval is required."), 400);
    const receipt = await beginTrackedExecution(requestId, tx);
    if (receipt.status === "confirmed")
      return NextResponse.json(
        { status: "Success", code: 0, signature: receipt.signature },
        { headers: { "Cache-Control": "no-store" } },
      );
    const result = await fetchJSON("https://api.jup.ag/swap/v2/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...jupiterHeaders() },
      body: JSON.stringify({ signedTransaction, requestId }),
    });
    try {
      await finishTrackedExecution(receipt, result);
    } catch {
      // A successful trade must remain successful if reporting is interrupted.
      // The durable pending receipt is reconciled against Solana by /api/volume.
      console.warn("Volume receipt pending reconciliation");
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
