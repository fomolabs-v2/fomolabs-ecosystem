"use client";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Wallet,
  ArrowUpRight,
  RefreshCw,
  History,
  ShieldCheck,
  Copy,
} from "lucide-react";
import { Footer, TerminalSidebar } from "./shell";
import {
  ConnectButton,
  CopyButton,
  DataError,
  EmptyState,
  TokenIcon,
} from "./ui";
import { useData, useMarkets } from "./use-data";
import {
  TOKENS,
  SOL,
  USDC,
  money,
  shortAddress,
  amountFormat,
} from "@/lib/tokens";
import { decimalAmount } from "@/lib/validation";
type WalletData = {
  balances: {
    address: string;
    raw: string;
    decimals: number;
    symbol: string;
    name: string;
  }[];
  history: {
    signature: string;
    blockTime: number | null;
    err: unknown;
    confirmationStatus: string;
  }[];
  partial: boolean;
  historyAvailable: boolean;
  fetchedAt: string;
};
export function Portfolio({ activity = false }: { activity?: boolean }) {
  const { connected, publicKey } = useWallet();
  const wallet = publicKey?.toBase58();
  const data = useData<WalletData>(
    wallet ? `/api/wallet?address=${wallet}` : null,
    30000,
  );
  const { data: marketData } = useMarkets();
  const holdings =
    data.data?.balances.map((b) => {
      const quantity = Number(decimalAmount(b.raw, b.decimals));
      const price = marketData?.markets.find(
        (m) => m.token.address === b.address,
      )?.price;
      return {
        ...b,
        quantity,
        value: price !== undefined ? price * quantity : null,
      };
    }) || [];
  const total = holdings.reduce((sum, h) => sum + (h.value || 0), 0);
  const unpriced = holdings.filter((h) => h.value === null).length;
  return (
    <>
      <main id="main-content" className="terminal-layout">
        <TerminalSidebar />
        <div className="account-page">
          <div className="page-heading">
            <div>
              <span className="eyebrow">YOUR WORKSPACE</span>
              <h1>
                {activity
                  ? "Every move, in view."
                  : "Your portfolio, in focus."}
              </h1>
              <p>
                {activity
                  ? "Recent on-chain transactions from your Solana wallet."
                  : "Your assets. Your wallet. One clear picture."}
              </p>
            </div>
            {connected && (
              <button className="button secondary" onClick={data.refresh}>
                <RefreshCw size={15} /> Refresh
              </button>
            )}
          </div>
          {!connected ? (
            <div className="portfolio-connect panel">
              <div className="wallet-illustration">
                <Wallet size={55} strokeWidth={1.2} />
                <span />
                <i />
              </div>
              <h2>
                {activity
                  ? "Your activity starts here."
                  : "Your wallet is your account."}
              </h2>
              <p>
                Connect a Solana wallet to see your{" "}
                {activity
                  ? "recent transactions"
                  : "balances and on-chain activity"}
                .<br />
                You stay in control of your assets.
              </p>
              <ConnectButton />
              <div className="connect-assurances">
                <span>
                  <ShieldCheck size={14} /> No seed phrases
                </span>
                <span>
                  <Wallet size={14} /> Read-only until you approve
                </span>
              </div>
            </div>
          ) : (
            <>
              {data.error && (
                <DataError error={data.error} retry={data.refresh} />
              )}
              <div className="connected-wallet">
                <span className="network-dot" />
                <span>{wallet && shortAddress(wallet)}</span>
                {wallet && <CopyButton value={wallet} />}
                <span>Solana mainnet</span>
              </div>
              {data.data?.partial && (
                <DataError
                  error="Some wallet data is unavailable. Values below may be incomplete."
                  retry={data.refresh}
                />
              )}{" "}
              {!activity && (
                <>
                  <div className="portfolio-summary">
                    <div className="balance-card panel">
                      <span>Tracked asset value</span>
                      <strong>
                        {data.data && marketData ? money(total) : "—"}
                      </strong>
                      <small>
                        Current holdings · no profit/loss implied
                        {unpriced
                          ? ` · ${unpriced} unpriced token${unpriced === 1 ? "" : "s"}`
                          : ""}
                      </small>
                    </div>
                    <div className="balance-card panel">
                      <span>Assets in wallet</span>
                      <strong>{data.data ? holdings.length : "—"}</strong>
                      <small>Native SOL, SPL & Token-2022</small>
                    </div>
                  </div>
                  <section className="panel holdings-panel">
                    <div className="panel-subheading">
                      <h2>Your assets</h2>
                      <Link className="text-link" href="/trade">
                        Trade <ArrowUpRight size={14} />
                      </Link>
                    </div>
                    <div className="table-scroll">
                      <table className="holdings-table">
                        <thead>
                          <tr>
                            <th>Asset</th>
                            <th>Balance</th>
                            <th>Value (USD)</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {holdings.map((h) => (
                            <tr key={h.address}>
                              <td>
                                <div className="table-token">
                                  <TokenIcon
                                    token={
                                      TOKENS.find(
                                        (t) => t.address === h.address,
                                      ) || { symbol: "?" }
                                    }
                                  />
                                  <span>
                                    <strong>{h.symbol}</strong>
                                    <small>
                                      {h.symbol === "Unknown"
                                        ? shortAddress(h.address)
                                        : h.name}
                                    </small>
                                  </span>
                                </div>
                              </td>
                              <td>{amountFormat(h.quantity)}</td>
                              <td>
                                {h.value === null ? "Unpriced" : money(h.value)}
                              </td>
                              <td>
                                <Link
                                  className="text-link"
                                  href={`/trade?token=${h.address}`}
                                >
                                  Trade <ArrowUpRight size={14} />
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.loading && (
                        <p className="loading-text">Reading wallet balances…</p>
                      )}
                    </div>
                  </section>
                </>
              )}
              <section className="panel account-activity">
                <div className="panel-subheading">
                  <h2>Recent transactions</h2>
                  <span>Last 25 on-chain transactions</span>
                </div>
                {data.data?.historyAvailable === false ? (
                  <DataError
                    error="Transaction history could not be loaded."
                    retry={data.refresh}
                  />
                ) : data.data && !data.data.history.length ? (
                  <EmptyState
                    icon={<History size={24} />}
                    title="No recent activity"
                    description="Transactions from this wallet will appear here."
                  />
                ) : (
                  <div className="table-scroll">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Transaction</th>
                          <th>Time</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {data.data?.history.map((tx) => (
                          <tr key={tx.signature}>
                            <td>{shortAddress(tx.signature)}</td>
                            <td>
                              {tx.blockTime
                                ? new Date(tx.blockTime * 1000).toLocaleString()
                                : "Pending"}
                            </td>
                            <td>
                              <span
                                className={tx.err ? "negative" : "positive"}
                              >
                                {tx.err ? "Failed" : tx.confirmationStatus}
                              </span>
                            </td>
                            <td>
                              <a
                                className="text-link"
                                href={`https://solscan.io/tx/${tx.signature}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View <ArrowUpRight size={14} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
