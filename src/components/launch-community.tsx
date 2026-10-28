"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Megaphone,
  ShieldCheck,
  ArrowUpRight,
  Plus,
  UserRound,
  Trash2,
  Flag,
  Check,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { ConnectButton, Modal, TokenIcon, CopyButton, DataError } from "./ui";
import { TokenPicker } from "./token-picker";
import { useData } from "./use-data";
import {
  communityRequest,
  useCommunityApproval,
  useWalletChanged,
  type CommunityFeed,
} from "./community-client";
import { TOKENS, shortAddress, type Token } from "@/lib/tokens";
import type { Callout, Profile, CommunityAction } from "@/lib/community";

export function ProfileAvatar({
  profile,
  wallet,
  large = false,
}: {
  profile?: Profile | null;
  wallet: string;
  large?: boolean;
}) {
  return (
    <span
      className={`profile-avatar accent-${profile?.accent || "cyan"} ${large ? "large" : ""}`}
    >
      {(profile?.name || wallet).slice(0, 2).toUpperCase()}
    </span>
  );
}
export function ProfileEditor({
  profile,
  onSaved,
}: {
  profile?: Profile | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false),
    [name, setName] = useState(profile?.name || ""),
    [bio, setBio] = useState(profile?.bio || ""),
    [website, setWebsite] = useState(profile?.website || ""),
    [accent, setAccent] = useState<Profile["accent"]>(
      profile?.accent || "cyan",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const approve = useCommunityApproval();
  const { publicKey } = useWallet();
  useWalletChanged(() => {
    setOpen(false);
    setError("");
    setBusy(false);
  });
  const show = () => {
    setName(profile?.name || "");
    setBio(profile?.bio || "");
    setWebsite(profile?.website || "");
    setAccent(profile?.accent || "cyan");
    setError("");
    setOpen(true);
  };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const proof = await approve({
        kind: "profile",
        name,
        bio,
        website,
        accent,
      });
      await communityRequest("/api/community", proof);
      setOpen(false);
      onSaved();
      toast.success("Profile saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Profile could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="button secondary" onClick={show} disabled={!publicKey}>
        <UserRound size={16} />
        {profile ? "Edit profile" : "Create profile"}
      </button>
      <Modal
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
        title={profile ? "Edit your profile" : "Your FomoLabs profile"}
        description="Your name, bio, website, and wallet address will be public. Your wallet approves each change."
      >
        <form className="launch-form" onSubmit={save}>
          <label>
            Display name
            <input
              required
              minLength={2}
              maxLength={32}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How the community knows you"
            />
          </label>
          <label>
            Bio
            <textarea
              maxLength={240}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A little about you"
              rows={3}
            />
          </label>
          <label>
            Website <span className="muted">optional</span>
            <input
              type="url"
              maxLength={200}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
            />
          </label>
          <fieldset className="avatar-colors">
            <legend>Profile color</legend>
            {(["cyan", "violet", "green", "pink"] as const).map((color) => (
              <button
                key={color}
                type="button"
                className={`color-choice accent-${color}`}
                onClick={() => setAccent(color)}
                aria-label={`${color} profile color`}
                aria-pressed={accent === color}
              >
                {accent === color && <Check size={17} />}
              </button>
            ))}
          </fieldset>
          {error && (
            <p role="alert" className="launch-error">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}{" "}
            {busy ? "Waiting for wallet…" : "Approve & save profile"}
          </button>
        </form>
      </Modal>
    </>
  );
}

function CalloutCard({
  post,
  profile,
  onChanged,
}: {
  post: Callout;
  profile?: Profile;
  onChanged: () => void;
}) {
  const { publicKey } = useWallet();
  const mine = publicKey?.toBase58() === post.wallet;
  const [busy, setBusy] = useState(false),
    [report, setReport] = useState(false),
    [reason, setReason] = useState<
      "spam" | "impersonation" | "misleading" | "abuse"
    >("spam");
  const approve = useCommunityApproval();
  async function act(action: CommunityAction) {
    setBusy(true);
    try {
      await communityRequest("/api/community", await approve(action));
      setReport(false);
      onChanged();
      toast.success(
        action.kind === "report" ? "Report received" : "Callout removed",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="callout-card panel">
      <div className="callout-author">
        <Link href={`/profile/${post.wallet}`} className="callout-identity">
          <ProfileAvatar profile={profile} wallet={post.wallet} />
          <span>
            <strong>{profile?.name || shortAddress(post.wallet)}</strong>
            <small>
              {shortAddress(post.wallet)} ·{" "}
              {new Date(post.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </small>
          </span>
        </Link>
        {mine ? (
          <button
            className="icon-button"
            aria-label="Remove your callout"
            disabled={busy}
            onClick={() => void act({ kind: "delete-callout", id: post.id })}
          >
            <Trash2 size={15} />
          </button>
        ) : (
          <button
            className="icon-button"
            aria-label="Report callout"
            disabled={!publicKey || busy}
            onClick={() => setReport(true)}
          >
            <Flag size={15} />
          </button>
        )}
      </div>
      <p className="callout-text">{post.text}</p>
      {post.disclosure !== "none" && (
        <span className="badge soon">
          {post.disclosure === "paid" ? "Paid promotion" : "Team / affiliate"}
        </span>
      )}
      <Link
        href={`/trade?token=${post.token.address}`}
        className="callout-token"
      >
        <TokenIcon token={post.token} />
        <span>
          <strong>{post.token.symbol}</strong>
          <small>
            {post.token.name} · {shortAddress(post.token.address)}
          </small>
        </span>
        <ArrowUpRight size={17} />
      </Link>
      <div className="holding-stamp">
        <ShieldCheck size={13} />
        <span>Held when posted</span>
        <time title={new Date(post.holdingCheckedAt).toLocaleString()}>
          On-chain check
        </time>
      </div>
      <Modal
        open={report}
        onOpenChange={setReport}
        title="Report this callout"
        description="Reports go to the FomoLabs review queue. They do not automatically remove a post."
      >
        <div className="launch-form">
          <label>
            Reason
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}
            >
              <option value="spam">Spam</option>
              <option value="impersonation">Impersonation</option>
              <option value="misleading">Misleading promotion</option>
              <option value="abuse">Abuse</option>
            </select>
          </label>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void act({ kind: "report", id: post.id, reason })}
          >
            {busy ? "Waiting for wallet…" : "Approve & send report"}
          </button>
        </div>
      </Modal>
    </article>
  );
}
export function CalloutComposer({
  profile,
  onPosted,
  initialMint,
}: {
  initialMint?: string | null;
  profile?: Profile | null;
  onPosted: () => void;
}) {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58();
  const [token, setToken] = useState<Token>(TOKENS[2]),
    [text, setText] = useState(""),
    [disclosure, setDisclosure] = useState<"none" | "paid" | "team">("none"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const selected = useData<{ tokens: Token[] }>(
    initialMint ? `/api/tokens?q=${encodeURIComponent(initialMint)}` : null,
  );
  useEffect(() => {
    const match = selected.data?.tokens.find((t) => t.address === initialMint);
    if (match) setToken(match);
  }, [selected.data, initialMint]);
  const approve = useCommunityApproval();
  const holding = useData<{ eligible: boolean; checkedAt: number }>(
    wallet
      ? `/api/community/holding?wallet=${wallet}&mint=${token.address}`
      : null,
    30000,
  );
  useWalletChanged(() => {
    setText("");
    setError("");
    setBusy(false);
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const proof = await approve({
        kind: "callout",
        mint: token.address,
        text,
        disclosure,
      });
      await communityRequest("/api/community", proof);
      setText("");
      onPosted();
      toast.success("Callout published");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Callout could not be published.",
      );
      holding.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="callout-compose panel">
      <div className="composer-heading">
        <Megaphone size={20} />
        <div>
          <h2>Make your call.</h2>
          <p>Share a token you actually hold.</p>
        </div>
      </div>
      {!wallet ? (
        <div className="callout-onboarding">
          <p>Connect your wallet to create a profile and post.</p>
          <ConnectButton />
        </div>
      ) : !profile ? (
        <div className="callout-onboarding">
          <p>Give your wallet a name before your first callout.</p>
          <ProfileEditor onSaved={onPosted} />
        </div>
      ) : (
        <form className="launch-form" onSubmit={submit}>
          <div className="composer-token">
            <TokenPicker
              token={token}
              onChange={(t) => {
                setToken(t);
                setError("");
              }}
              label="Choose callout token"
            />
            <button
              type="button"
              className="text-button"
              onClick={holding.refresh}
              disabled={holding.loading}
            >
              <RefreshCw size={13} /> Check holding
            </button>
          </div>
          <p
            className={`gate-status ${holding.data?.eligible && !holding.error ? "positive" : "muted"}`}
            role="status"
          >
            {holding.loading
              ? "Checking your on-chain balance…"
              : holding.error
                ? "Balance unavailable. Retry before posting."
                : holding.data?.eligible
                  ? `You hold ${token.symbol}. Ready to post.`
                  : `Hold ${token.symbol} in this wallet to post about it.`}
          </p>
          {!holding.loading && !holding.data?.eligible && (
            <Link
              className="text-button"
              href={`/trade?token=${token.address}`}
            >
              View {token.symbol} on FOMO DEX <ArrowUpRight size={13} />
            </Link>
          )}
          <label className="sr-only" htmlFor="callout-text">
            Your callout
          </label>
          <textarea
            id="callout-text"
            required
            minLength={8}
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="What’s your perspective on this token?"
          />
          <div className="composer-count">{text.length}/500</div>
          <label>
            Promotion disclosure
            <select
              value={disclosure}
              onChange={(e) =>
                setDisclosure(e.target.value as typeof disclosure)
              }
            >
              <option value="none">No compensation or team affiliation</option>
              <option value="paid">Paid promotion / compensated</option>
              <option value="team">Team member / affiliated</option>
            </select>
          </label>
          {error && (
            <p role="alert" className="launch-error">
              {error}
            </p>
          )}
          <button
            className="button primary"
            disabled={
              busy ||
              holding.loading ||
              !!holding.error ||
              !holding.data?.eligible ||
              text.trim().length < 8
            }
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Megaphone size={16} />
            )}{" "}
            {busy ? "Waiting for wallet…" : "Approve & post callout"}
          </button>
          <p className="fineprint">
            Public post linked to your wallet. Any positive, unfrozen token
            balance qualifies; checked again when you post.
          </p>
        </form>
      )}
    </section>
  );
}
export function CalloutFeed({
  data,
  error,
  loading,
  refresh,
  wallet,
}: {
  wallet?: string;
  data?: CommunityFeed | null;
  error?: string | null;
  loading: boolean;
  refresh: () => void;
}) {
  const [older, setOlder] = useState<CommunityFeed[]>([]),
    [busy, setBusy] = useState(false);
  useEffect(() => setOlder([]), [wallet]);
  const cursor = older.length ? older.at(-1)?.next : data?.next;
  async function more() {
    if (!cursor) return;
    setBusy(true);
    try {
      setOlder((p) => [...p]);
      const next = await communityRequest<CommunityFeed>(
        `/api/community?before=${cursor}${wallet ? `&wallet=${wallet}` : ""}`,
      );
      setOlder((p) => [...p, next]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  const pages = [...(data ? [data] : []), ...older];
  const seen = new Set<string>();
  return (
    <div className="callout-feed">
      <div className="feed-heading">
        <h2>Community callouts</h2>
        <button
          className="icon-button"
          onClick={() => {
            setOlder([]);
            refresh();
          }}
          aria-label="Refresh callout feed"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {error && <DataError error={error} retry={refresh} />}
      <p className="fineprint">
        Community opinions. The holding badge records the posting-time balance
        check, not a recommendation or current position.
      </p>
      {loading && !data && (
        <div className="launch-empty">Loading callouts…</div>
      )}
      {data && !data.callouts.length && !error && (
        <div className="launch-empty panel">
          <Megaphone size={28} />
          <h3>The conversation starts here.</h3>
          <p>
            No callouts yet. Create your profile and share a token you hold.
          </p>
        </div>
      )}
      {pages.flatMap((page) =>
        page.callouts
          .filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          })
          .map((post) => (
            <CalloutCard
              key={post.id}
              post={post}
              profile={page.profiles[post.wallet]}
              onChanged={() => {
                setOlder([]);
                refresh();
              }}
            />
          )),
      )}
      {cursor && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void more()}
        >
          {busy ? "Loading…" : "Load more callouts"}
        </button>
      )}
    </div>
  );
}
export function CommunityWorkspace({
  initialMint,
}: {
  initialMint?: string | null;
}) {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58();
  const feed = useData<CommunityFeed>("/api/community", 30000);
  const own = useData<CommunityFeed>(
    wallet ? `/api/community?wallet=${wallet}` : null,
    30000,
  );
  const refresh = () => {
    feed.refresh();
    own.refresh();
  };
  return (
    <div className="community-layout">
      <div>
        <CalloutComposer
          profile={own.data?.profile}
          onPosted={refresh}
          initialMint={initialMint}
        />
        {wallet && (
          <Link className="profile-link" href={`/profile/${wallet}`}>
            <UserRound size={16} /> View your public profile{" "}
            <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
      <CalloutFeed
        data={feed.data}
        error={feed.error}
        loading={feed.loading}
        refresh={refresh}
      />
    </div>
  );
}
export function PublicProfile({ address }: { address?: string }) {
  const { publicKey } = useWallet();
  const wallet = address || publicKey?.toBase58();
  const own = publicKey?.toBase58() === wallet;
  const result = useData<CommunityFeed>(
    wallet ? `/api/community?wallet=${wallet}` : null,
    30000,
  );
  const profile = result.data?.profile;
  return (
    <main id="main-content" className="page-container profile-page">
      <Link className="text-button" href="/launch?tab=callouts">
        ← Back to FOMOLAUNCH
      </Link>
      {!wallet ? (
        <section className="launch-empty panel">
          <UserRound size={32} />
          <h1>Your community profile</h1>
          <p>Connect a wallet to create and manage your profile.</p>
          <ConnectButton />
        </section>
      ) : (
        <>
          <section className="public-profile panel">
            <ProfileAvatar profile={profile} wallet={wallet} large />
            <div>
              <span className="eyebrow muted">FOMOLABS COMMUNITY</span>
              <h1>{profile?.name || shortAddress(wallet)}</h1>
              <p>{profile?.bio || "This wallet has not added a bio yet."}</p>
              <div className="profile-address">
                <code>{wallet}</code>
                <CopyButton value={wallet} />
              </div>
              {profile?.website && (
                <a
                  className="text-button"
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                >
                  Website <ArrowUpRight size={14} />
                </a>
              )}
            </div>
            {own && (
              <ProfileEditor profile={profile} onSaved={result.refresh} />
            )}
          </section>
          {result.error && (
            <DataError error={result.error} retry={result.refresh} />
          )}
          <CalloutFeed
            key={wallet}
            wallet={wallet}
            data={result.data}
            error={null}
            loading={result.loading}
            refresh={result.refresh}
          />
          {!!result.data?.launches.length && (
            <section className="profile-launches">
              <h2>Created tokens</h2>
              {result.data.launches.map((l) => (
                <Link
                  key={l.mint}
                  href={`https://pump.fun/coin/${l.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="callout-token panel"
                >
                  <TokenIcon token={{ symbol: l.symbol, icon: l.image }} />
                  <span>
                    <strong>{l.name}</strong>
                    <small>
                      {l.symbol} · {shortAddress(l.mint)}
                    </small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
