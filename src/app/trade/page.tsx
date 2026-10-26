"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  Activity,
  ExternalLink,
  Wallet,
  CircleAlert,
} from "lucide-react";
import { TerminalSidebar } from "@/components/shell";
import { TokenPicker } from "@/components/token-picker";
import { PriceChart } from "@/components/chart";
import { SwapPanel } from "@/components/swap";
import { DexVolumeCard } from "@/components/dex-volume-card";
import { useMarkets, useData } from "@/components/use-data";
import {
  Change,
  CopyButton,
  DataError,
  LiveBadge,
  EmptyState,
} from "@/components/ui";
import {
  TOKENS,
  SOL,
  type Market,
  type PoolTrade,
  money,
  shortAddress,
} from "@/lib/tokens";
function TradeContent() {
  const params = useSearchParams(),
    router = useRouter();
  const mint = params.get("token") || SOL;
  const { data, error, refresh } = useMarkets();
  const known = data?.markets.find((m) => m.token.address === mint);
  const custom = useData<{ markets: Market[] }>(
    !TOKENS.some((t) => t.address === mint)
      ? `/api/markets?mint=${encodeURIComponent(mint)}`
      : null,
    60000,
  );
  const market = known || custom.data?.markets[0] || null;
  const token =
    market?.token || TOKENS.find((t) => t.address === mint) || TOKENS[0];
  const [tab, setTab] = useState("Recent trades"),
    [mobileTab, setMobileTab] = useState("Chart");
  const trades = useData<{ trades: PoolTrade[] }>(
    market && tab === "Recent trades"
      ? `/api/chart?pool=${market.pool}&kind=trades`
      : null,
    60000,
  );
  return (
    <main id="main-content" className="terminal-layout">
      <h1 className="sr-only">FOMO DEX trading terminal</h1>
      <TerminalSidebar />
      <div className="terminal-main">
        <div className="terminal-topline">
          <div>
            <span className="eyebrow">FOMO DEX</span>
            <span className="terminal-separator">/</span>
            <span>Trading terminal</span>
          </div>
          <LiveBadge>Solana mainnet</LiveBadge>
        </div>
        <div className="mobile-terminal-tabs segmented">
          {["Chart", "Swap"].map((t) => (
            <button
              key={t}
              className={mobileTab === t ? "active" : ""}
              onClick={() => setMobileTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {(error || custom.error) && (
          <DataError
            error={error || custom.error!}
            retry={custom.error ? custom.refresh : refresh}
          />
        )}
        <div className={`trading-grid mobile-show-${mobileTab.toLowerCase()}`}>
          <section className="trading-center">
            <div className="panel trading-chart">
              <div className="market-heading">
                <div>
                  <TokenPicker
                    token={token}
                    expanded
                    label="Select chart token"
                    onChange={(t) => router.push(`/trade?token=${t.address}`)}
                  />
                  <span className="pool-name">
                    {market?.dex || "Solana"}{" "}
                    <span>· {market?.quote || "USD"} pool</span>
                  </span>
                </div>
                <div className="market-price">
                  <strong>{market ? money(market.price) : "—"}</strong>
                  {market && <Change value={market.change} />}
                  <small>24h</small>
                </div>
              </div>
              <div className="market-stat-row">
                <div>
                  <span>Market cap</span>
                  <strong>{money(market?.marketCap, true)}</strong>
                </div>
                <div>
                  <span>Liquidity</span>
                  <strong>{money(market?.liquidity, true)}</strong>
                </div>
                <div>
                  <span>24h volume</span>
                  <strong>{money(market?.volume, true)}</strong>
                </div>
                <div>
                  <span>24h transactions</span>
                  <strong>
                    {market
                      ? (market.buys + market.sells).toLocaleString()
                      : "—"}
                  </strong>
                </div>
              </div>
              <PriceChart market={market} />
            </div>
            <div className="panel trades-panel">
              <div
                className="panel-tabs"
                role="group"
                aria-label="Market details"
              >
                {["Recent trades", "Token details", "My activity"].map((t) => (
                  <button
                    key={t}
                    className={tab === t ? "active" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
                <span className="trade-source">Selected pool</span>
              </div>
              {tab === "Recent trades" ? (
                <>
                  {trades.error && (
                    <DataError error={trades.error} retry={trades.refresh} />
                  )}
                  <div className="table-scroll trades-scroll">
                    <table className="trades-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Side</th>
                          <th>Value (USD)</th>
                          <th>Transaction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.data?.trades.slice(0, 12).map((t, i) => (
                          <tr key={`${t.hash}-${i}`}>
                            <td>
                              {new Date(t.time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </td>
                            <td>
                              <span
                                className={`trade-side ${t.side === "buy" ? "positive" : "negative"}`}
                              >
                                {t.side}
                              </span>
                            </td>
                            <td>{money(t.volume)}</td>
                            <td>
                              <a
                                href={`https://solscan.io/tx/${t.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {shortAddress(t.hash)}
                                <ArrowUpRight size={12} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {trades.loading && (
                      <p className="loading-text">Loading pool trades…</p>
                    )}
                    {trades.data && !trades.data.trades.length && (
                      <p className="loading-text">
                        No recent trades in this pool.
                      </p>
                    )}
                  </div>
                </>
              ) : tab === "Token details" ? (
                <div className="token-details">
                  <div>
                    <span>Token mint</span>
                    <a
                      href={`https://solscan.io/token/${token.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {token.address}
                      <ArrowUpRight size={13} />
                    </a>
                    <CopyButton value={token.address} />
                  </div>
                  <div>
                    <span>Decimals</span>
                    <strong>{token.decimals}</strong>
                  </div>
                  <div>
                    <span>Selected pool</span>
                    <strong>
                      {market?.dex} · {market && shortAddress(market.pool)}
                    </strong>
                  </div>
                  <div>
                    <span>Fully diluted valuation</span>
                    <strong>{money(market?.fdv, true)}</strong>
                  </div>
                  <p>
                    Market data reflects the selected pool. Liquidity and prices
                    can vary between venues. Verify token details independently
                    before trading.
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={<Wallet size={23} />}
                  title="Your on-chain activity"
                  description="View recent transactions from your connected Solana wallet."
                  action={
                    <Link className="button secondary" href="/activity">
                      View activity <ArrowUpRight size={15} />
                    </Link>
                  }
                />
              )}
            </div>
          </section>
          <aside className="trading-right">
            <SwapPanel target={token} />
            {market && market.liquidity < 10000 && (
              <div className="liquidity-notice">
                <CircleAlert size={16} />
                <div>
                  <strong>Low pool liquidity</strong>
                  <p>
                    This pool has {money(market.liquidity)} liquidity. Review
                    price impact carefully.
                  </p>
                </div>
              </div>
            )}
            <div className="pool-card panel">
              <div className="panel-subheading">
                <span>Pool overview</span>
                <Activity size={14} />
              </div>
              <div className="pool-buy-sell">
                <span>
                  Buys <b>{market?.buys ?? "—"}</b>
                </span>
                <span>
                  Sells <b>{market?.sells ?? "—"}</b>
                </span>
              </div>
              <div className="buy-sell-bar">
                <i
                  style={{
                    width:
                      market && market.buys + market.sells
                        ? `${(market.buys / (market.buys + market.sells)) * 100}%`
                        : "50%",
                  }}
                />
              </div>
              <p>Transactions over the last 24 hours</p>
              {market && (
                <a
                  href={market.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  View pool on DEX Screener <ExternalLink size={12} />
                </a>
              )}
            </div>
            <Link className="terminal-launch-banner" href="/launch">
              <span className="badge soon">COMING SOON</span>
              <strong>
                From your first idea
                <br />
                to your next launch.
              </strong>
              <span>
                Discover FOMOLAUNCH <ArrowUpRight size={14} />
              </span>
            </Link>
          </aside>
        </div>
        <DexVolumeCard />
        <div className="terminal-status">
          <LiveBadge>Data refreshes every 60s</LiveBadge>
          <span>
            Jupiter routing <span>·</span> Wallet approval required
          </span>
        </div>
      </div>
    </main>
  );
}
export default function TradePage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="loading-page">
          Loading your workspace…
        </main>
      }
    >
      <TradeContent />
    </Suspense>
  );
}
