# FomoLabs

<img src="public/brand/icon-192.png" alt="FomoLabs" width="96" />

**A new perspective on decentralized finance.**

[![Platform checks](https://github.com/fomolabs-v2/fomolabs-ecosystem/actions/workflows/ci.yml/badge.svg)](https://github.com/fomolabs-v2/fomolabs-ecosystem/actions/workflows/ci.yml)

[Open FomoLabs](https://www.fomolabs.world) · [Trade on FOMO DEX](https://www.fomolabs.world/trade) · [Create & connect on FOMOLAUNCH](https://www.fomolabs.world/launch)

**Solana CA:** `DSEUEGxgDizLLLrVXmCqyAwD9GScpBsoH7HLmMYqfomo`

[View the token on Solscan](https://solscan.io/token/DSEUEGxgDizLLLrVXmCqyAwD9GScpBsoH7HLmMYqfomo)

A responsive Solana ecosystem application built with Next.js App Router, TypeScript, Tailwind CSS, and TradingView Lightweight Charts. FOMOLAUNCH adds wallet-backed profiles, holder callouts, and token creation through Pump’s official SDK. Advanced scheduling and creator analytics remain planned.

## Run locally

```sh
npm ci
npm run dev
```

Open http://localhost:4210. Use `npm run build` and `npm start` for the production build. Run `npm test` for the transaction-safety, precision, and PWA checks, and `npm run typecheck` for TypeScript validation.

## Products and routes

- `/`: ecosystem home and live markets.
- `/trade`: candlestick terminal, pool statistics, recent trades, token metadata, Jupiter swaps.
- `/markets`: Jupiter token discovery, locally saved watchlist, sortable market table.
- `/analytics`: clearly scoped analytics across the selected tracked pools.
- `/portfolio` and `/activity`: public wallet balances and recent on-chain transactions.
- `/launch`: discovery, holder callouts (`?tab=callouts`), and token creation (`?tab=create`).
- `/profile` and `/profile/[wallet]`: your connected profile and public wallet profiles.
- `/ecosystem`: connected product navigation and the user-provided FOMO mint.
- `/about`: privacy, market sources, fees, risk, and attribution.

## Integrations and deployment

Jupiter Swap V2 is used for quotes, unsigned transaction construction, and submission after wallet approval. The server accepts only validated mints, integer base-unit amounts, and slippage between 0.1% and 3%. Quote review expires within 30 seconds (or sooner for a provider expiry). Wallet/amount changes invalidate approval context. The connected wallet must match the transaction payer. Price impact above 3% requires acknowledgement; above 15% is blocked. Only `Success` with code `0` and a transaction signature is treated as confirmed.

The supplied FOMO mint is `DSEUEGxgDizLLLrVXmCqyAwD9GScpBsoH7HLmMYqfomo`, with 9 decimals. Verify the mint independently before trading.

DEX Screener supplies real pool statistics, GeckoTerminal supplies candles and pool trades, and Jupiter supplies token search. Provider outages are shown explicitly. No generated prices or fabricated balances are used. Unknown portfolio assets remain unpriced. Stats are selected-pool data, not chain-wide totals.

Optional server environment variables are documented in `.env.example`. The app works with keyless Jupiter access (limited capacity) and public Solana mainnet RPC with a second public provider for failover. Before a high-traffic public launch, configure a dedicated `SOLANA_RPC_URL` and a server-only `JUPITER_API_KEY`. In-memory cache/rate controls apply per server instance; use provider-level limits and Vercel Firewall or a shared rate store for stronger cross-instance enforcement. Never put provider keys in `NEXT_PUBLIC_` variables.

The production Vercel project is connected to this repository, with `main` as the production branch and [www.fomolabs.world](https://www.fomolabs.world) as the public domain. Pushes to `main` trigger deployment. For a separate installation, import this directory as its own Next.js project and connect a private Vercel Blob store for swap reporting. Do not deploy the parent workspace. All private environment files are excluded from source control and deployment uploads.

## Mobile and PWA

The home and trading pages show FOMO DEX Volume 24H from confirmed swaps executed through this application. The former demo counter has been removed. The adjacent FOMO CA uses the shared mint constant and provides copy and Solscan controls. The accessible SVG shows hourly USD volume; empty hours remain empty.

## Platform volume accounting

`/api/volume` returns a rolling 24-hour aggregate of confirmed FOMO DEX swaps. This is separate from the selected-pool volume shown in market analytics. A private Vercel Blob store is required (`BLOB_STORE_ID` with Vercel OIDC, or server-only `BLOB_READ_WRITE_TOKEN`). Never publish these credentials. No browser can directly write volume records.

The order endpoint persists the provider-issued exact-input order fingerprint and USD price. Before forwarding a signed transaction, the execution endpoint checks its message, quote expiry, and Ed25519 payer signature, then durably records a pending receipt. Provider-confirmed successful transactions are counted once by signature. A reporting interruption does not turn an already successful swap into a failure; pending receipts are reconciled against confirmed Solana transactions with the exact recorded message. USD amounts are estimates using provider pricing at execution. Unpriced swaps remain unpriced, and pending/failed swaps do not contribute to volume.

Ledger updates use ETag conditional writes and bounded conflict retries. Receipts retain a 48-hour window, with a 5,000-receipt capacity guard; migrate to a database/indexer before exceeding that capacity. Order fingerprints are private and retained separately. First activation records a tracking-start time, displayed until a full 24-hour window has accumulated. Historical volume is not backfilled or invented. Do not set a fabricated starting value or cap.

The manifest includes standard and maskable icons. The service worker caches icons and an offline fallback only; wallet data, API responses, quotes, and signed transactions are never cached. Trading requires an online connection. On mobile, use a wallet's in-app browser when a standalone PWA cannot reach the wallet. Installing the PWA does not install or create a wallet.

## Wallet compatibility

The chooser supports Phantom, Solflare, OKX Wallet, Coinbase Wallet, and automatically discovered Solana Wallet Standard wallets including Backpack, Trust Wallet, and Bitget Wallet. A legacy injected-provider fallback is included for OKX. Wallets must support Solana version-0 transaction signing. Unavailable wallets show installation or in-app-browser instructions; Phantom and Solflare include official mobile browse links. Selecting a wallet explicitly starts the connection, and cancellation permits retry. Reloading the site does not automatically open a wallet approval. Connected accounts have a separate manage/disconnect menu.

Tests cover adapter connection, cancellation/retry, account changes, disconnection, and rejected signing with no execution request. These isolated tests use test-only adapters; they do not prove approval in every physical wallet app. Browser QA also verifies the real Solflare connection screen opens without a pointer/focus-blocking app overlay. On mobile Safari/Chrome/PWA, opening the site in a wallet browser is the fallback when the wallet is not injected. Wallet Standard support depends on the installed wallet version.

Official integration references: [OKX Solana provider](https://web3.okx.com/onchainos/dev-docs/wallet/dapp-connect/chains/solana/provider), [Phantom browse](https://docs.phantom.com/phantom-deeplinks/other-methods/browse), [Solflare browse](https://docs.solflare.com/solflare/technical/deeplinks/other-methods/browse), [Jupiter order fields](https://developers.jup.ag/docs/api-reference/swap/order).

Price-impact safeguards use the absolute magnitude of Jupiter's signed percentage-point field, so negative adverse impact cannot bypass the 3% acknowledgement or 15% block. Reviewed transaction messages must remain byte-identical after wallet signing, and the payer signature must be present. Swaps pause when balances cannot be verified.

## Verification boundary

Automated checks exercise amount limits, address validation, order expiry, payer matching, execution result handling, real icon dimensions, and service-worker handling of offline/API requests. Live read-only checks cover market endpoints and Jupiter quotes. Actual wallet signing and funded trade confirmation must be verified by the wallet owner. This code has not undergone an independent security audit.

## FOMOLAUNCH

Every profile mutation, callout, report, or deletion requires an Ed25519 wallet message approval. A server-issued five-minute challenge binds the canonical action, payload hash, wallet, origin, nonce, and expiry. Nonces are consumed atomically with the mutation using Blob ETag compare-and-swap; retries cannot publish the same action twice. Profile names are not unique verified identities; the wallet address is the identity. User text is rendered as text, and external profile links allow HTTPS only.

Callouts require a public profile and a fresh server-side `getTokenAccountsByOwner` result at confirmed commitment for that exact mint. SPL and Token-2022 accounts are checked for owner, mint, program, state, and integer balance; frozen accounts do not qualify. Any positive amount qualifies. Client balances never authorize publication. The badge is explicitly historical: **held when posted**, with the check slot and timestamp retained. A sale after posting does not remove the historical post. Posting is limited to one per minute and ten per hour; promotion disclosure is required. Authors can remove their own posts. Signed reports are deduplicated in the private review queue; they do not automatically remove posts.

The private Blob object `fomolaunch-v1/community.json` contains profiles, callouts, confirmed launches, consumed proofs, and reports. Preview runs use the separate `fomolaunch-preview-v1` prefix. The public API exposes only public fields. Operators review reports from the private Blob dashboard; there is no unauthenticated moderation endpoint. Current capacity guards are 5,000 profiles, 5,000 posts, and 2,000 launches. This is an initial bounded persistence design: migrate community data, moderation, and distributed rate limits to a transactional database before scaling beyond these limits. Server instance IP limits supplement wallet limits; they are not distributed DDoS protection. Expired proofs are pruned from the ledger on mutation; challenge files and approved metadata are retained in private storage. Public metadata may remain even when the user cancels creation, as disclosed before approval.

Token creation uses `@pump-fun/pump-sdk` 4.3.1 `createV2Instruction`, with the connected wallet as creator/payer, a fresh browser-generated mint, SOL pairing, and both mayhem and holder-reward modes disabled. There is **no initial buy**. The official Pump program creates the Token-2022 mint and bonding curve. The mint key exists only in browser memory; no wallet keys or mint secrets are sent to the server. Metadata images are limited in size and decoded/re-encoded to WebP, with their SHA-256 bound to the metadata approval. Approved metadata is served on the canonical FomoLabs domain; hosting is not decentralized and must be maintained.

Before approval, the server simulates the exact unsigned mainnet transaction, checks payer funds and returns a short-lived cost review. The browser verifies signer/program constraints and unchanged bytes after signing. The server checks both Ed25519 signatures against the exact stored message and expiry before broadcasting with preflight enabled. Network timeouts are treated as uncertain, not success. A stored public review ID lets the browser reconcile after a reload. Launch records appear only after a confirmed, successful Solana transaction matching both message and signature. New launches are searchable in the local token registry before Jupiter indexing; market/quote availability still depends on providers. Read-only mainnet simulation is verified; no funded launch was executed during implementation.

## Credits

TradingView Lightweight Charts™ — Copyright (с) 2025 TradingView, Inc. https://www.tradingview.com/. Apache-2.0. Chart attribution remains enabled. Inter is licensed under the SIL Open Font License; see `public/fonts/LICENSE.txt`. Logo supplied by the user.

## Dependency review (28 October 2026)

The dependency check reports zero high or critical advisories after updating Sharp, pinning the compatible UUID 11 release, and updating the Blob CLI configuration dependency's Zod version. Ten moderate reports remain through the Solana SDK's Jayson / stream-json dependency chain, including the added Coinbase adapter. The app imports Jayson's browser client; its streaming server parser is absent from the original Next.js API deployment traces. The app parses inbound requests with native JSON parsing and bounds transaction request sizes. A breaking parser override has deliberately not been forced. Reassess these upstream advisories and complete an independent review before a broad financial launch.

The Pump SDK’s Anchor TOML dependency is overridden to patched 5.0.1. The transitive `bigint-buffer` native addon is replaced with the small, tested, bounded pure-JavaScript compatibility package in `vendor/bigint-buffer` to eliminate its native buffer overflow path (GHSA-3gc7-fjrx-p6mg). It rejects negative values, invalid widths, and integer overflow. Keep the local package in source and deployment uploads. The dependency audit still reports the ten moderate upstream advisories noted above.
