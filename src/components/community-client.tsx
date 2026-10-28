"use client";
import { useCallback, useRef, useEffect } from "react";
import { Buffer } from "buffer";
import { useWallet } from "@solana/wallet-adapter-react";
import type {
  CommunityAction,
  Callout,
  Profile,
  LaunchRecord,
} from "@/lib/community";
export type CommunityFeed = {
  callouts: Callout[];
  profiles: Record<string, Profile>;
  profile: Profile | null;
  launches: LaunchRecord[];
  next: string | null;
};
export async function communityRequest<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Please try again.");
  return data;
}
export function useCommunityApproval() {
  const { publicKey, signMessage } = useWallet();
  const wallet = publicKey?.toBase58();
  const current = useRef(wallet);
  current.current = wallet;
  return useCallback(
    async (action: CommunityAction) => {
      if (!wallet || !signMessage)
        throw new Error(
          "Connect a Solana wallet that supports message signing, such as Phantom, Solflare, or OKX.",
        );
      const challenge = await communityRequest<{
        id: string;
        message: string;
        expiresAt: number;
      }>("/api/community/challenge", { wallet, action });
      if (current.current !== wallet)
        throw new Error("Wallet changed. Please review again.");
      const signature = await signMessage(
        new TextEncoder().encode(challenge.message),
      );
      if (current.current !== wallet)
        throw new Error("Wallet changed. Please review again.");
      return {
        id: challenge.id,
        signature: Buffer.from(signature).toString("base64"),
      };
    },
    [wallet, signMessage],
  );
}
export function useWalletChanged(reset: () => void) {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58();
  useEffect(reset, [wallet]);
}
