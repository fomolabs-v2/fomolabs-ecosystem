"use client";
import { Activity, Layers3, ArrowUpRight, BarChart3 } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/shell";
import { useMarkets } from "@/components/use-data";
import { TokenIcon, LiveBadge, DataError, Change } from "@/components/ui";
import { money } from "@/lib/tokens";
export default function Analytics() {
  const { data, loading, error, refresh } = useMarkets();
  const markets = data?.markets || [];
  const volume = markets.reduce((sum, m) => sum + m.volume, 0),
    liquidity = markets.reduce((sum, m) => sum + m.liquidity, 0),
    txns = markets.reduce((sum, m) => sum + m.buys + m.sells, 0),
    max = Math.max(...markets.map((m) => m.volume), 1);
  return (
    <>
      <main id="main-content" className="page-container interior-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">SIGNALS, WITH CONTEXT</span>
            <h1>A wider perspective.</h1>
            <p>
              Understand liquidity and activity across the pools you’re
              watching.
            </p>
          </div>
          <LiveBadge>Live pool analytics</LiveBadge>
        </div>
        {error && <DataError error={error} retry={refresh} />}
        <div className="analytics-stats">
          <div className="highlight-card">
            <span>
              <BarChart3 size={16} /> Tracked 24h volume
            </span>
            <strong>{data ? money(volume, true) : "—"}</strong>
            <small>Across {markets.length || "—"} selected pools</small>
          </div>
          <div className="highlight-card">
            <span>
              <Layers3 size={16} /> Tracked liquidity
            </span>
            <strong>{data ? money(liquidity, true) : "—"}</strong>
            <small>Highest-liquidity indexed pool per token</small>
          </div>
          <div className="highlight-card">
            <span>
              <Activity size={16} /> 24h transactions
            </span>
            <strong>{data ? txns.toLocaleString() : "—"}</strong>
            <small>Buys + sells in selected pools</small>
          </div>
        </div>
        <div className="analytics-grid">
          <section className="panel volume-panel">
            <div className="panel-subheading">
              <h2>Where the activity is</h2>
              <span>24h pool volume</span>
            </div>
            {loading && <p className="loading-text">Loading analytics…</p>}
            {[...markets]
              .sort((a, b) => b.volume - a.volume)
              .map((m) => (
                <div className="volume-row" key={m.token.address}>
                  <div>
                    <TokenIcon token={m.token} small />
                    <strong>{m.token.symbol}</strong>
                    <span>{money(m.volume, true)}</span>
                  </div>
                  <div className="volume-track">
                    <i
                      style={{
                        width: `${Math.max(0.5, (m.volume / max) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </section>
          <section className="panel liquidity-panel">
            <div className="panel-subheading">
              <h2>Liquidity at a glance</h2>
              <Layers3 size={17} />
            </div>
            {[...markets]
              .sort((a, b) => b.liquidity - a.liquidity)
              .map((m) => (
                <Link
                  key={m.token.address}
                  href={`/trade?token=${m.token.address}`}
                >
                  <TokenIcon token={m.token} small />
                  <div>
                    <strong>{m.token.symbol}</strong>
                    <small>{m.dex}</small>
                  </div>
                  <span>
                    {money(m.liquidity, true)}
                    <ArrowUpRight size={13} />
                  </span>
                </Link>
              ))}
          </section>
        </div>
        <p className="page-note">
          This dashboard aggregates the selected pools shown above. It is not
          total Solana volume or total value locked. Market data: DEX Screener.
          Updated every 60 seconds.
        </p>
      </main>
      <Footer />
    </>
  );
}
