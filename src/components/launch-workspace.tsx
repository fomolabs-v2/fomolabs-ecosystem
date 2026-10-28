"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Compass,
  Megaphone,
  Rocket,
  UserRound,
  ShieldCheck,
} from "lucide-react";
import { CommunityWorkspace } from "./launch-community";
import { CreateToken } from "./create-token";
import { useData, useMarkets } from "./use-data";
import { TokenIcon, Change, DataError } from "./ui";
import { Footer } from "./shell";
import type { CommunityFeed } from "./community-client";
import { shortAddress } from "@/lib/tokens";
function Explore() {
  const community = useData<CommunityFeed>("/api/community", 30000),
    markets = useMarkets();
  return (
    <div className="launch-explore">
      <div className="feed-heading">
        <div>
          <h2>Created on FOMOLAUNCH</h2>
          <p className="fineprint">
            Confirmed token creations. No paid placement.
          </p>
        </div>
        <Link className="text-button" href="/launch?tab=create">
          Create a token <ArrowUpRight size={15} />
        </Link>
      </div>
      {community.error ? (
        <DataError error={community.error} retry={community.refresh} />
      ) : !community.data ? (
        <div className="launch-empty panel">Loading confirmed launches…</div>
      ) : community.data.launches.length ? (
        <div className="launch-token-grid">
          {community.data.launches.map((t) => (
            <article className="launch-discovery-card panel" key={t.mint}>
              <img className="launch-token-art" src={t.image} alt="" />
              <div>
                <h3>
                  {t.name}
                  <span>{t.symbol}</span>
                </h3>
                <p>{t.description}</p>
                <Link href={`/profile/${t.wallet}`} className="text-button">
                  By {shortAddress(t.wallet)}
                </Link>
                <a
                  className="button secondary"
                  href={`https://pump.fun/coin/${t.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View token <ArrowUpRight size={15} />
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="launch-first panel">
          <div className="launch-first-icon">
            <Rocket size={32} />
          </div>
          <div>
            <h3>The next idea could be yours.</h3>
            <p>
              No tokens have been launched here yet. Create one, review the
              cost, and approve it in your wallet.
            </p>
          </div>
          <Link className="button secondary" href="/launch?tab=create">
            Create a token <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      <div className="feed-heading discovery-title">
        <div>
          <h2>Explore the ecosystem</h2>
          <p className="fineprint">
            Existing tokens on FOMO DEX · data from DexScreener
          </p>
        </div>
        <Link className="text-button" href="/markets">
          All markets <ArrowUpRight size={14} />
        </Link>
      </div>
      {markets.error && (
        <DataError error={markets.error} retry={markets.refresh} />
      )}
      <div className="ecosystem-token-grid">
        {markets.data?.markets
          .filter((m) => !["SOL", "USDC"].includes(m.token.symbol))
          .map((m) => (
            <Link
              className="ecosystem-discovery-card panel"
              href={`/trade?token=${m.token.address}`}
              key={m.token.address}
            >
              <TokenIcon token={m.token} />
              <div>
                <h3>{m.token.symbol}</h3>
                <p>{m.token.name}</p>
              </div>
              <div>
                <strong>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumSignificantDigits: 4,
                  }).format(m.price)}
                </strong>
                <Change value={m.change} />
              </div>
              <ArrowUpRight size={16} />
            </Link>
          ))}
      </div>
    </div>
  );
}
export function LaunchWorkspace() {
  const params = useSearchParams(),
    tab = params.get("tab") || "explore",
    active = ["explore", "callouts", "create"].includes(tab) ? tab : "explore";
  return (
    <>
      <main id="main-content" className="page-container launch-workspace">
        <section
          className={`launch-banner panel ${active !== "explore" ? "compact" : ""}`}
        >
          <div>
            <span className="eyebrow">
              <i />
              FOMOLAUNCH · SOLANA
            </span>
            {active === "explore" ? (
              <>
                <h1>
                  Ideas become tokens.
                  <br />
                  <span>Holders start conversations.</span>
                </h1>
                <p>
                  Create your token. Find your community.
                  <br className="mobile-break" /> Make a call that’s backed by
                  your wallet.
                </p>
                <div className="launch-banner-actions">
                  <Link href="/launch?tab=create" className="button primary">
                    <Rocket size={16} /> Create a token
                  </Link>
                  <Link href="/launch?tab=callouts" className="text-button">
                    Explore callouts <ArrowUpRight size={15} />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1>
                  {active === "callouts"
                    ? "The holders have a voice."
                    : "Your next idea starts here."}
                </h1>
                <p>
                  {active === "callouts"
                    ? "Public conversations, backed by a token holding."
                    : "Create your Solana token with a clear review and wallet approval."}
                </p>
              </>
            )}
          </div>
          {active === "explore" && (
            <div className="launch-orbit" aria-hidden="true">
              <div className="orbit-ring one" />
              <div className="orbit-ring two" />
              <img src="/brand/logo.webp" alt="" />
              <span className="orbit-chip">
                <ShieldCheck size={15} /> Wallet-backed voices
              </span>
            </div>
          )}
        </section>
        <div className="launch-navigation">
          <nav aria-label="FOMOLAUNCH workspace">
            {[
              { id: "explore", label: "Explore", Icon: Compass },
              { id: "callouts", label: "Callouts", Icon: Megaphone },
              { id: "create", label: "Create token", Icon: Rocket },
            ].map(({ id, label, Icon }) => (
              <Link
                key={id}
                href={`/launch?tab=${id}`}
                aria-current={active === id ? "page" : undefined}
                className={active === id ? "active" : ""}
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/profile"
            className="launch-profile-nav"
            aria-label="Your community profile"
          >
            <UserRound size={17} />
            <span>Your profile</span>
          </Link>
        </div>
        {active === "callouts" ? (
          <CommunityWorkspace initialMint={params.get("token")} />
        ) : active === "create" ? (
          <CreateToken />
        ) : (
          <Explore />
        )}
        <div className="launch-footer-note">
          <ShieldCheck size={14} />
          <p>
            Callouts require a confirmed token balance. Token creation requires
            wallet approval. Advanced launch scheduling and creator analytics
            are coming soon.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
