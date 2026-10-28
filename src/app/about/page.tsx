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
          FOMOLAUNCH creates Solana tokens using Pump’s program and official SDK.
          The creation transaction does not include an initial purchase. Network
          fees and account rent are paid by the approving wallet. On-chain creation
          is irreversible. Advanced scheduling and creator analytics remain planned.
        </p>
        <h2>Public profiles and callouts</h2>
        <p>
          Profiles, wallet addresses, callout text, promotion disclosures, token
          metadata, and launch signatures are public. Each profile edit and post
          requires a wallet message signature. Callouts require a positive,
          unfrozen balance of the exact token, verified on Solana when posted.
          “Held when posted” records that check; it is not proof of a current
          holding, identity, token quality, or future returns. Authors can remove
          their posts. Reports are retained privately for review and do not
          automatically hide content.
        </p>
        <p>
          Launch images and metadata are published when you approve the metadata
          message, before any creation transaction. They are hosted by FomoLabs;
          availability depends on this service. A public launch review ID is saved
          on your device to recover confirmation status. Ephemeral mint keys stay
          in browser memory and are never sent to FomoLabs. Signed transaction
          messages are checked against the exact review before submission.
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
