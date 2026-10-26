"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowUpRight,
  Compass,
  Star,
  TrendingUp,
  Layers3,
} from "lucide-react";
import { Footer } from "@/components/shell";
import { MarketTable } from "@/components/market-table";
import { useData, useDebounced, useMarkets } from "@/components/use-data";
import { TokenIcon, Change, DataError, LiveBadge } from "@/components/ui";
import { FOMO, type Token, money, shortAddress } from "@/lib/tokens";
export default function Markets() {
  const [tab, setTab] = useState("All tokens"),
    [query, setQuery] = useState("");
  const debounced = useDebounced(query, 600);
  const { data, error, loading, refresh } = useMarkets();
  const results = useData<{ tokens: Token[] }>(
    debounced ? `/api/tokens?q=${encodeURIComponent(debounced)}` : null,
  );
  const fomo = data?.markets.find((m) => m.token.address === FOMO),
    top = data?.markets.reduce((a, b) => (a.change > b.change ? a : b));
  return (
    <>
      <main id="main-content" className="page-container interior-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">DISCOVER WHAT’S NEXT</span>
            <h1>Explore the market.</h1>
            <p>Find your conviction. Follow the tokens that matter to you.</p>
          </div>
          <LiveBadge>Solana markets</LiveBadge>
        </div>
        <div className="market-highlights">
          <div className="highlight-card">
            <span>
              <TrendingUp size={16} /> Top mover in this list
            </span>
            <div>
              <strong>{top?.token.symbol || "—"}</strong>
              {top && <Change value={top.change} />}
            </div>
            <small>24h change · Selected tracked pools</small>
          </div>
          <Link
            href={`/trade?token=${FOMO}`}
            className="highlight-card fomo-highlight"
          >
            <span>
              <Layers3 size={16} /> The ecosystem token{" "}
              <ArrowUpRight size={15} />
            </span>
            <div>
              <strong>FOMO</strong>
              <span>{fomo ? money(fomo.price) : "—"}</span>
            </div>
            <small>Fomo Labs on Solana</small>
          </Link>
          <div className="highlight-card">
            <span>
              <Compass size={16} /> Discovery without limits
            </span>
            <div>
              <strong>Any Solana token.</strong>
            </div>
            <small>Search by token name or exact mint address</small>
          </div>
        </div>
        <div className="panel">
          <div className="markets-controls">
            <div className="panel-tabs">
              {["All tokens", "Watchlist"].map((t) => (
                <button
                  key={t}
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                >
                  {t === "Watchlist" && <Star size={14} />} {t}
                </button>
              ))}
            </div>
            <label className="search-field">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tokens or mint address"
                aria-label="Discover tokens"
              />
            </label>
          </div>
          {(error || results.error) && (
            <DataError
              error={error || results.error!}
              retry={results.error ? results.refresh : refresh}
            />
          )}{" "}
          {debounced ? (
            <div className="discovery-results">
              {results.loading && (
                <p className="loading-text">Searching Solana…</p>
              )}
              {results.data?.tokens.map((t) => (
                <Link
                  className="token-result"
                  key={t.address}
                  href={`/trade?token=${t.address}`}
                >
                  <TokenIcon token={t} />
                  <span>
                    <strong>{t.symbol}</strong>
                    <small>
                      {t.name} · {shortAddress(t.address)}
                    </small>
                  </span>
                  <ArrowUpRight size={17} />
                </Link>
              ))}
              {results.data && !results.data.tokens.length && (
                <p className="loading-text">
                  No tokens found. Try the exact mint address.
                </p>
              )}
            </div>
          ) : loading ? (
            <div className="table-loading">
              <div className="loading-orbit" />
              Loading markets
            </div>
          ) : (
            data && (
              <MarketTable
                markets={data.markets}
                onlySaved={tab === "Watchlist"}
              />
            )
          )}
          <div className="panel-footnote">
            <span>Prices and liquidity: DEX Screener. Discovery: Jupiter.</span>
            <span>Watchlist saved on this device.</span>
          </div>
        </div>
        <p className="page-note">
          Statistics reflect the highest-liquidity indexed pool for each token,
          not the entire Solana market. Token discovery does not imply
          endorsement.
        </p>
      </main>
      <Footer />
    </>
  );
}
