import { NextRequest, NextResponse } from "next/server";
import { failure, rateLimit, rpc } from "@/lib/server";
import { validAddress } from "@/lib/validation";
import { SOL, TOKENS } from "@/lib/tokens";
export async function GET(req: NextRequest) {
  try {
    rateLimit(req, "wallet", 20);
    const address = req.nextUrl.searchParams.get("address");
    if (!validAddress(address))
      return failure(new Error("Invalid wallet."), 400);
    const calls = await Promise.allSettled([
      rpc("getBalance", [address, { commitment: "confirmed" }]),
      rpc("getTokenAccountsByOwner", [
        address,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed", commitment: "confirmed" },
      ]),
      rpc("getTokenAccountsByOwner", [
        address,
        { programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" },
        { encoding: "jsonParsed", commitment: "confirmed" },
      ]),
      rpc("getSignaturesForAddress", [
        address,
        { limit: 25, commitment: "confirmed" },
      ]),
    ]);
    const balance = calls[0],
      spl = calls[1],
      token2022 = calls[2],
      history = calls[3];
    if (balance.status === "rejected")
      throw new Error("Wallet balances are unavailable. Please retry.");
    const balances: Record<
      string,
      {
        address: string;
        raw: string;
        decimals: number;
        symbol: string;
        name: string;
      }
    > = {
      [SOL]: {
        address: SOL,
        raw: String(balance.value.value),
        decimals: 9,
        symbol: "SOL",
        name: "Solana",
      },
    };
    for (const result of [spl, token2022])
      if (result.status === "fulfilled")
        for (const item of result.value.value || []) {
          const info = item.account.data.parsed.info,
            mint = info.mint,
            raw = info.tokenAmount.amount;
          if (raw === "0") continue;
          const token = TOKENS.find((t) => t.address === mint);
          balances[mint] = {
            address: mint,
            raw: (BigInt(balances[mint]?.raw || "0") + BigInt(raw)).toString(),
            decimals: info.tokenAmount.decimals,
            symbol: token?.symbol || "Unknown",
            name: token?.name || "Unpriced token",
          };
        }
    return NextResponse.json(
      {
        balances: Object.values(balances),
        history: history.status === "fulfilled" ? history.value : [],
        partial: calls.some((r) => r.status === "rejected"),
        historyAvailable: history.status === "fulfilled",
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
