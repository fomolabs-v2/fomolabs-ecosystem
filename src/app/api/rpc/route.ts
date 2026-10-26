import { NextRequest, NextResponse } from "next/server";
import { failure, rateLimit, rpc, sameOrigin } from "@/lib/server";
const allowed = new Set([
  "getLatestBlockhash",
  "getBlockHeight",
  "getVersion",
  "getBalance",
  "getSignatureStatuses",
  "getAccountInfo",
  "getFeeForMessage",
]);
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    rateLimit(req, "rpc", 45);
    const raw = await req.text();
    if (raw.length > 8000) return failure(new Error("Request too large."), 413);
    const body = JSON.parse(raw);
    if (!allowed.has(body.method) || !Array.isArray(body.params || []))
      return failure(new Error("RPC method is not allowed."), 400);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: body.id,
        result: await rpc(body.method, body.params || []),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
