"use client";
import { useMemo, useState, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletConnectionProvider } from "./wallet-dialog";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase";
import { OkxWalletAdapter } from "@/lib/okx-wallet";
import { walletConnectionError } from "@/lib/wallet-options";
import { Toaster } from "sonner";
import { Buffer } from "buffer";
import { MarketProvider } from "./use-data";
import { Pwa } from "./pwa";
import "@solana/wallet-adapter-react-ui/styles.css";
if (typeof window !== "undefined") window.Buffer = Buffer;
export function Providers({ children }: { children: ReactNode }) {
  const [walletError, setWalletError] = useState<string | null>(null);
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new OkxWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    [],
  );
  const endpoint =
    typeof window === "undefined"
      ? "https://api.mainnet-beta.solana.com"
      : `${window.location.origin}/api/rpc`;
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={(error) => setWalletError(walletConnectionError(error))}
      >
        <WalletConnectionProvider
          error={walletError}
          clearError={() => setWalletError(null)}
        >
          <MarketProvider>
            {children}
            <Pwa />
            <Toaster
              theme="dark"
              position="bottom-right"
              richColors
              closeButton
            />
          </MarketProvider>
        </WalletConnectionProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
