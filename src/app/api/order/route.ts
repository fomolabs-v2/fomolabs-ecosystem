import { NextRequest, NextResponse } from "next/server";
import {
  failure,
  fetchJSON,
  jupiterBudget,
  jupiterHeaders,
  rateLimit,
} from "@/lib/server";
import { validateOrderParams } from "@/lib/validation";
import { makeTrackedOrder } from "@/lib/dex-volume";
import { saveTrackedOrder } from "@/lib/volume-store";
import { orderExpiry } from "@/lib/trade-safety";
export async function GET(req: NextRequest) {
  try {
    rateLimit(req, "order", 20);
    const q = req.nextUrl.searchParams;
    const inputMint = q.get("inputMint") || "",
      outputMint = q.get("outputMint") || "",
      amount = q.get("amount") || "",
      taker = q.get("taker") || undefined,
      slippageBps = Number(q.get("slippageBps") || 50);
    try {
      validateOrderParams(inputMint, outputMint, amount, slippageBps, taker);
    } catch (e) {
      return failure(e, 400);
    }
    jupiterBudget();
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      slippageBps: String(slippageBps),
      maxSupportedTransactionVersion: "0",
    });
    if (taker) params.set("taker", taker);
    const order = await fetchJSON(
      `https://api.jup.ag/swap/v2/order?${params}`,
      { headers: jupiterHeaders() },
    );
    if (
      order.errorCode ||
      !order.outAmount ||
      !order.otherAmountThreshold ||
      (taker && !order.transaction)
    )
      return failure(
        new Error(
          order.errorMessage ||
            "No executable route is available for this trade.",
        ),
        422,
      );
    if (
      order.inputMint !== inputMint ||
      order.outputMint !== outputMint ||
      order.inAmount !== amount
    )
      return failure(
        new Error("The provider returned a mismatched quote."),
        502,
      );
    if (
      !/^\d+$/.test(order.outAmount) ||
      !/^\d+$/.test(order.otherAmountThreshold) ||
      BigInt(order.outAmount) <= 0n ||
      BigInt(order.otherAmountThreshold) <= 0n ||
      BigInt(order.otherAmountThreshold) > BigInt(order.outAmount) ||
      !Number.isFinite(order.priceImpact) ||
      !Number.isFinite(order.feeBps)
    ) {
      return failure(
        new Error(
          "The provider returned incomplete amount or risk information. Please retry.",
        ),
        502,
      );
    }
    if (taker && Math.abs(order.priceImpact) > 15)
      return failure(
        new Error(
          "Price impact exceeds 15%. This trade is blocked. Try a smaller amount.",
        ),
        422,
      );
    const receivedAt = Date.now();
    if (taker)
      await saveTrackedOrder(
        makeTrackedOrder(
          order,
          receivedAt,
          orderExpiry(receivedAt, order.expireAt),
        ),
      );
    return NextResponse.json(
      { ...order, receivedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
