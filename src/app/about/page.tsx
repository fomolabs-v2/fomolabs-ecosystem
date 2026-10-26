import { Footer } from "@/components/shell";
import { FOMO } from "@/lib/tokens";
export const metadata = { title: "Privacy & disclosures" };
export default function About() {
  return (
    <>
      <main id="main-content" className="page-container prose-page">
        <span className="eyebrow">CLEAR BY DESIGN</span>
        <h1>Privacy & disclosures</h1>
        <h2>Your wallet stays yours.</h2>
        <p>
          FomoLabs never asks for seed phrases or private keys. Connecting a
          wallet lets the app read your public address. Transactions require a
          separate approval in your wallet. FomoLabs does not hold your assets.
        </p>
        <h2>Public blockchain data</h2>
        <p>
          Your public wallet address is sent to a Solana RPC provider to
          retrieve balances and recent transactions. Trading requests send token
          mints, amounts, and, when preparing a transaction, your public wallet
          address to Jupiter. Signed transactions are forwarded only after
          wallet approval.
        </p>
        <h2>Data on this device</h2>
        <p>
          The watchlist is stored locally in your browser. The service worker
          caches app icons and an offline page. Wallet balances, transaction
          requests, signed transactions, and API responses are not cached for
          offline use. This build does not include advertising trackers.
        </p>
        <h2>Market information</h2>
        <p>
          Prices, liquidity, and pool statistics come from DEX Screener. Candles
          and recent pool trades come from GeckoTerminal. Token discovery and
          swap routing come from Jupiter. Data may be delayed or unavailable.
          Pool statistics reflect a selected pool, not market-wide totals.
          Unknown portfolio assets are labeled unpriced.
        </p>
        <h2>Trading costs and risk</h2>
        <p>
          FOMO DEX Volume 24H counts confirmed swaps submitted through this app,
          once per transaction signature. USD values use Jupiter pricing at execution
          and are estimates. Private server storage retains order fingerprints,
          transaction signatures, amounts, and confirmation times for reporting;
          it does not store seed phrases, private keys, or signed transactions.
          Tracking begins from the date shown on the volume card. Earlier trades
          and trades on other platforms are not included.
        </p>
        <p>
          The review screen displays estimated output, minimum output, slippage,
          provider fee, price impact, and available network fee estimates.
          Prices can move and transactions can fail. The app blocks swaps whose
          quoted price impact exceeds 15%. Wallet and provider fees may still
          apply to failed on-chain transactions.
        </p>
        <h2>FOMO token</h2>
        <p>
          The Fomo Labs token mint on Solana is <code>{FOMO}</code>.
          Verify it independently. No token utility, future returns, or
          guaranteed listing is promised.
        </p>
        <h2>FOMOLAUNCH status</h2>
        <p>
          Token creation, launch management, liquidity integrations, and creator
          tools are planned features. They are not released. No launch date is
          promised, and this app accepts no launchpad deposits.
        </p>
        <h2>Open-source charting</h2>
        <p>
          TradingView Lightweight Charts™. Copyright (с) 2025 TradingView, Inc.
          Distributed under the Apache License 2.0.{" "}
          <a
            href="https://www.tradingview.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            TradingView
          </a>{" "}
          provides the charting library; FomoLabs supplies the data integration.
        </p>
      </main>
      <Footer />
    </>
  );
}
