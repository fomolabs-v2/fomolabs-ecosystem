"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeftRight,
  Layers3,
  Rocket,
  ShieldCheck,
  Zap,
  ChevronRight,
  Globe2,
  ChartNoAxesCombined,
  Plus,
} from "lucide-react";
import { Footer } from "@/components/shell";
import { useMarkets } from "@/components/use-data";
import { Change, DataError, LiveBadge, TokenIcon } from "@/components/ui";
import { MarketTable } from "@/components/market-table";
import { PriceChart } from "@/components/chart";
import { InstallButton } from "@/components/pwa";
import { DexVolumeCard } from "@/components/dex-volume-card";
import { FOMO, SOL, money } from "@/lib/tokens";
export default function Home() {
  const { data, loading, error, refresh } = useMarkets();
  const fomo = data?.markets.find((m) => m.token.address === FOMO),
    sol = data?.markets.find((m) => m.token.address === SOL);
  return (
    <>
      <main id="main-content">
        <section className="hero-section">
          <div className="hero-glow" />
          <div className="hero-grid" />
          <div className="hero-content">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="tiny-orbit" /> THE FOMOLABS ECOSYSTEM
              </div>
              <h1>
                DeFi, with a<br />
                <span className="gradient-text">new perspective.</span>
              </h1>
              <p>
                One connected ecosystem. Built for the way you trade, discover,
                and create on Solana.
              </p>
              <div className="hero-actions">
                <Link className="button primary large" href="/trade">
                  Launch FOMO DEX <ArrowUpRight size={18} />
                </Link>
                <Link className="button secondary large" href="/ecosystem">
                  Explore ecosystem <ArrowRight size={17} />
                </Link>
              </div>
              <div className="hero-trust">
                <span>
                  <ShieldCheck size={14} /> Self-custodial
                </span>
                <span>
                  <Zap size={14} /> Powered by Solana
                </span>
              </div>
            </div>
            <div
              className="hero-art"
              aria-label="FomoLabs emblem surrounded by the trading ecosystem"
            >
              <div className="orbital orbital-one" />
              <div className="orbital orbital-two" />
              <div className="orbital orbital-three" />
              <div className="hero-emblem">
                <img
                  src="/brand/hero.webp"
                  width="500"
                  height="500"
                  alt="The illuminated cyan and violet FomoLabs F emblem"
                  fetchPriority="high"
                />
              </div>
              <div className="floating-label art-top">
                <span className="art-icon">
                  <ChartNoAxesCombined size={21} />
                </span>
                <div>
                  <small>YOUR NEXT MOVE</small>
                  <strong>Starts here.</strong>
                </div>
                <ArrowUpRight size={17} />
              </div>
              <div className="floating-label art-bottom">
                <span className="art-icon purple">
                  <Layers3 size={21} />
                </span>
                <div>
                  <small>ONE ECOSYSTEM</small>
                  <strong>More possibilities.</strong>
                </div>
              </div>
              <span className="art-coordinate">SOLANA NATIVE · 01</span>
              <span className="star-point star-a" />
              <span className="star-point star-b" />
            </div>
          </div>
          <div className="hero-market-strip">
            <div className="strip-label">
              <LiveBadge>MARKET PULSE</LiveBadge>
              <small>Selected pools · live data</small>
            </div>
            <div>
              <span>
                Solana <b>SOL</b>
              </span>
              <strong>{sol ? money(sol.price) : "—"}</strong>
              {sol && <Change value={sol.change} />}
            </div>
            <div>
              <span>
                Fomo Labs <b>FOMO</b>
              </span>
              <strong>{fomo ? money(fomo.price) : "—"}</strong>
              {fomo && <Change value={fomo.change} />}
            </div>
            <div className="strip-liquidity">
              <span>FOMO pool liquidity</span>
              <strong>{fomo ? money(fomo.liquidity, true) : "—"}</strong>
              <small>Meteora</small>
            </div>
            <Link href="/markets" className="text-link">
              Explore markets <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
        <div className="page-container home-content">
          <DexVolumeCard />
          <section className="products-section" id="products">
            <div className="section-heading">
              <div>
                <span className="eyebrow muted">BUILT TO GO FURTHER</span>
                <h2>One ecosystem. More possibilities.</h2>
              </div>
              <p>Different tools. A shared ambition.</p>
            </div>
            <div className="product-grid">
              <Link href="/trade" className="product-card dex-product">
                <div className="product-top">
                  <span className="product-number">01 / TRADE</span>
                  <LiveBadge>Live on Solana</LiveBadge>
                </div>
                <div className="product-body">
                  <div className="product-symbol">
                    <ArrowLeftRight size={38} strokeWidth={1.6} />
                    <span />
                  </div>
                  <div>
                    <h3>FOMO DEX</h3>
                    <p>
                      Your edge in every trade. Discover tokens and swap across
                      Solana with intelligent routing.
                    </p>
                  </div>
                </div>
                <div className="product-bottom">
                  <span>Enter the terminal</span>
                  <span className="circle-arrow">
                    <ArrowUpRight size={19} />
                  </span>
                </div>
              </Link>
              <Link href="/launch" className="product-card launch-product">
                <div className="product-top">
                  <span className="product-number">02 / CREATE</span>
                  <span className="badge soon">Coming soon</span>
                </div>
                <div className="product-body">
                  <div className="product-symbol purple">
                    <Rocket size={39} strokeWidth={1.6} />
                    <span />
                  </div>
                  <div>
                    <h3>FOMOLAUNCH</h3>
                    <p>
                      Big ideas deserve a great beginning. The next chapter for
                      token creators on Solana.
                    </p>
                  </div>
                </div>
                <div className="product-bottom">
                  <span>Meet your future launchpad</span>
                  <span className="circle-arrow">
                    <ArrowUpRight size={19} />
                  </span>
                </div>
              </Link>
            </div>
          </section>
          <section className="home-markets">
            <div className="section-heading">
              <div>
                <span className="eyebrow muted">STAY A STEP AHEAD</span>
                <h2>Find your next move.</h2>
              </div>
              <Link href="/markets" className="text-link">
                All markets <ArrowRight size={16} />
              </Link>
            </div>
            <div className="panel market-home-panel">
              {error && <DataError error={error} retry={refresh} />}{" "}
              {loading ? (
                <div className="table-loading">
                  <div className="loading-orbit" />
                  Connecting to live markets
                </div>
              ) : (
                data && <MarketTable markets={data.markets} compact />
              )}
              <div className="panel-footnote">
                <LiveBadge>Live market data</LiveBadge>
                <span>DEX Screener · Highest-liquidity pool per token</span>
              </div>
            </div>
          </section>
          <section className="terminal-showcase">
            <div className="showcase-copy">
              <span className="eyebrow muted">THE FOMO DEX EXPERIENCE</span>
              <h2>
                A clearer view.
                <br />A more confident move.
              </h2>
              <p>
                Real-time market context, interactive charts, and transparent
                swap routes. Everything you need, in one focused workspace.
              </p>
              <div className="showcase-feature">
                <ChartNoAxesCombined size={19} />
                <span>See the market from every angle</span>
              </div>
              <div className="showcase-feature">
                <ShieldCheck size={19} />
                <span>Review every trade. Keep control.</span>
              </div>
              <Link href="/trade" className="button secondary">
                Open trading terminal <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="showcase-terminal panel">
              <div className="showcase-terminal-top">
                <div className="window-dots">
                  <i />
                  <i />
                  <i />
                </div>
                <span>FOMO DEX / SOL–USD</span>
                <LiveBadge>LIVE</LiveBadge>
              </div>
              <div className="showcase-price">
                <div>
                  <TokenIcon token={{ symbol: "SOL" }} />
                  <strong>
                    Solana <small>SOL / USD</small>
                  </strong>
                </div>
                <span>
                  {sol ? money(sol.price) : "—"}
                  {sol && <Change value={sol.change} />}
                </span>
              </div>
              <PriceChart market={sol || null} compact />
            </div>
          </section>
          <section className="mobile-callout">
            <div className="mobile-callout-icon">
              <Globe2 size={32} />
              <span />
            </div>
            <div>
              <span className="eyebrow muted">MOVE AT YOUR OWN SPEED</span>
              <h2>Your ecosystem. Anywhere.</h2>
              <p>
                Desktop precision. Mobile freedom. Install FomoLabs and keep
                your next move close.
              </p>
            </div>
            <InstallButton full />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
