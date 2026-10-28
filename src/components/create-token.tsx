"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  ArrowUpRight,
  Check,
  ImagePlus,
  LoaderCircle,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { ConnectButton, CopyButton } from "./ui";
import { communityRequest, useCommunityApproval } from "./community-client";
import { sameMessage, validateLaunchMessage } from "@/lib/launch-client";
import type { PreparedLaunch } from "@/lib/launch-safety";
type LaunchStatus = {
  status:
    "awaiting-approval" | "submitted" | "confirmed" | "failed" | "expired";
  mint: string;
  signature?: string;
};
const pendingKey = "fomolabs-pending-launch-v1";
export function CreateToken() {
  const { publicKey, signTransaction } = useWallet(),
    wallet = publicKey?.toBase58();
  const approve = useCommunityApproval(),
    walletRef = useRef(wallet);
  walletRef.current = wallet;
  const mintKey = useRef<Keypair | null>(null);
  const [name, setName] = useState(""),
    [symbol, setSymbol] = useState(""),
    [description, setDescription] = useState(""),
    [website, setWebsite] = useState(""),
    [image, setImage] = useState(""),
    [imageHash, setImageHash] = useState("");
  const [prepared, setPrepared] = useState<PreparedLaunch | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [accepted, setAccepted] = useState(false),
    [pending, setPending] = useState<string | null>(null),
    [status, setStatus] = useState<LaunchStatus | null>(null),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    setPrepared(null);
    mintKey.current = null;
    setAccepted(false);
    setError("");
  }, [wallet]);
  useEffect(() => {
    try {
      setPending(localStorage.getItem(pendingKey));
    } catch {}
  }, []);
  useEffect(() => {
    if (!prepared) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [prepared]);
  useEffect(() => {
    if (
      !pending ||
      (status && ["confirmed", "failed", "expired"].includes(status.status))
    )
      return;
    let active = true;
    async function check() {
      try {
        const result = await communityRequest<LaunchStatus>(
          `/api/launch/execute?id=${pending}`,
        );
        if (!active) return;
        setStatus(result);
        setError("");
        if (["confirmed", "failed", "expired"].includes(result.status)) {
          try {
            localStorage.removeItem(pendingKey);
          } catch {}
        }
      } catch {
        if (active)
          setError(
            "Confirmation is temporarily unavailable. Keep this page open or return to check again.",
          );
      }
    }
    void check();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [pending, status?.status]);
  async function selectImage(file?: File) {
    setError("");
    setImage("");
    setImageHash("");
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1_400_000
    ) {
      setError("Choose a PNG, JPEG, or WebP image under 1.4 MB.");
      return;
    }
    try {
      const bytes = await file.arrayBuffer();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setImage(
        `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`,
      );
      setImageHash(hash);
    } catch {
      setError("Image could not be loaded. Please choose another file.");
    }
  }
  async function prepare(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet || !imageHash) return;
    setBusy(true);
    setError("");
    setPrepared(null);
    setAccepted(false);
    const owner = wallet,
      mint = Keypair.generate();
    mintKey.current = mint;
    try {
      const proof = await approve({
        kind: "launch",
        mint: mint.publicKey.toBase58(),
        name,
        symbol,
        description,
        website,
        image: imageHash,
      });
      if (walletRef.current !== owner)
        throw new Error("Wallet changed. Please review again.");
      const result = await communityRequest<PreparedLaunch>(
        "/api/launch/prepare",
        { ...proof, image },
      );
      if (walletRef.current !== owner)
        throw new Error("Wallet changed. Please review again.");
      if (
        result.wallet !== owner ||
        result.mint !== mint.publicKey.toBase58() ||
        result.name !== name.trim() ||
        result.symbol !== symbol.trim().toUpperCase() ||
        result.metadataUri !==
          `https://www.fomolabs.world/api/launch/metadata/${result.mint}`
      )
        throw new Error("Launch review does not match your token.");
      validateLaunchMessage(
        VersionedTransaction.deserialize(
          Buffer.from(result.transaction, "base64"),
        ),
        owner,
        result.mint,
      );
      setNow(Date.now());
      setPrepared(result);
    } catch (e) {
      mintKey.current = null;
      setError(
        e instanceof Error ? e.message : "Launch review could not be prepared.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function launch() {
    if (
      !prepared ||
      !mintKey.current ||
      !signTransaction ||
      !wallet ||
      !accepted
    )
      return;
    setBusy(true);
    setError("");
    const p = prepared,
      owner = wallet;
    try {
      if (Date.now() >= p.expiresAt)
        throw new Error("Review expired. Prepare a fresh review.");
      const tx = VersionedTransaction.deserialize(
        Buffer.from(p.transaction, "base64"),
      );
      validateLaunchMessage(tx, owner, mintKey.current.publicKey.toBase58());
      const message = tx.message.serialize();
      tx.sign([mintKey.current]);
      const signed = await signTransaction(tx);
      if (walletRef.current !== owner)
        throw new Error("Wallet changed. Nothing was submitted.");
      if (!sameMessage(message, signed.message.serialize()))
        throw new Error(
          "Wallet returned a different transaction. Nothing was submitted.",
        );
      if (Date.now() >= p.expiresAt)
        throw new Error(
          "Review expired during wallet approval. Prepare a fresh review.",
        );
      // Only a public review ID is persisted, never the ephemeral mint secret.
      try {
        localStorage.setItem(pendingKey, p.id);
      } catch {}
      setPending(p.id);
      setStatus({ status: "submitted", mint: p.mint });
      await communityRequest("/api/launch/execute", {
        id: p.id,
        signedTransaction: Buffer.from(signed.serialize()).toString("base64"),
      });
      mintKey.current = null;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Submission could not be completed. Check status before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  const complete = status?.status === "confirmed",
    working =
      !!pending &&
      !complete &&
      !["failed", "expired"].includes(status?.status || "");
  if (pending)
    return (
      <section className="launch-result panel">
        <div className={`launch-result-icon ${complete ? "positive" : ""}`}>
          {complete ? (
            <Check size={32} />
          ) : working ? (
            <LoaderCircle className="spin" size={32} />
          ) : (
            <Rocket size={32} />
          )}
        </div>
        <span className="eyebrow">
          {complete
            ? "CONFIRMED ON SOLANA"
            : working
              ? "CHECKING THE NETWORK"
              : "LAUNCH STATUS"}
        </span>
        <h2>
          {complete
            ? "Your token is on-chain."
            : status?.status === "expired"
              ? "This launch expired."
              : status?.status === "failed"
                ? "The transaction failed."
                : "Waiting for confirmation."}
        </h2>
        <p>
          {complete
            ? "Your Pump bonding curve has been created. Your wallet has not made an initial purchase."
            : working
              ? "A submitted transaction is not a confirmed launch. We’ll keep checking its exact signature."
              : "No confirmed launch was found for this transaction. You can prepare a new review."}
        </p>
        {error && (
          <p className="launch-error" role="alert">
            {error}
          </p>
        )}
        {status?.mint && (
          <div className="profile-address">
            <code>{status.mint}</code>
            <CopyButton value={status.mint} />
          </div>
        )}
        {status?.signature && (
          <a
            className="button secondary"
            href={`https://solscan.io/tx/${status.signature}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View transaction <ArrowUpRight size={16} />
          </a>
        )}
        {complete && (
          <div className="launch-result-actions">
            <a
              className="button primary"
              href={`https://pump.fun/coin/${status.mint}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open token on Pump <ArrowUpRight size={16} />
            </a>
            <Link
              className="button secondary"
              href={`/launch?tab=callouts&token=${status.mint}`}
            >
              Join the callouts
            </Link>
          </div>
        )}
        {!working && (
          <button
            className="text-button"
            onClick={() => {
              setPending(null);
              setStatus(null);
              setPrepared(null);
              setError("");
              try {
                localStorage.removeItem(pendingKey);
              } catch {}
            }}
          >
            Start a new token
          </button>
        )}
        <p className="fineprint">
          DEX discovery and swaps become available when market providers index
          the new token.
        </p>
      </section>
    );
  return (
    <div className="create-token-layout">
      <section className="create-token-panel panel">
        <div className="composer-heading">
          <Rocket size={22} />
          <div>
            <h2>Bring your token to life.</h2>
            <p>Create a Solana token on a Pump bonding curve.</p>
          </div>
        </div>
        <form className="launch-form" onSubmit={prepare}>
          <fieldset disabled={busy || !!prepared} className="token-fields">
            <label className="token-image-upload">
              {image ? (
                <img src={image} alt="Your token image preview" />
              ) : (
                <ImagePlus size={28} />
              )}
              <span>
                <strong>
                  {image ? "Change token image" : "Add a token image"}
                </strong>
                <small>PNG, JPEG, WebP · up to 1.4 MB</small>
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => void selectImage(e.target.files?.[0])}
                required={!image}
              />
            </label>
            <div className="launch-form-row">
              <label>
                Token name
                <input
                  required
                  maxLength={32}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your next idea"
                />
              </label>
              <label>
                Symbol
                <input
                  required
                  pattern="[A-Za-z0-9]{1,13}"
                  maxLength={13}
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="TOKEN"
                />
              </label>
            </div>
            <label>
              Description
              <textarea
                required
                minLength={8}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tell people what you’re building."
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
          </fieldset>
          {error && (
            <p className="launch-error" role="alert">
              {error}
            </p>
          )}
          {!prepared && (
            <>
              {wallet ? (
                <button
                  className="button primary"
                  disabled={busy || !imageHash || !signTransaction}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <ShieldCheck size={17} />
                  )}{" "}
                  {busy
                    ? "Preparing your review…"
                    : "Approve metadata & review launch"}
                </button>
              ) : (
                <ConnectButton />
              )}
              <p className="fineprint">
                The first signature publishes your image and metadata on
                FomoLabs. A separate transaction approval creates the token and
                pays network costs.
              </p>
            </>
          )}
        </form>
        {prepared && (
          <div className="launch-review">
            <div className="feed-heading">
              <h3>Review your launch</h3>
              <span className="badge">
                {Math.max(0, Math.ceil((prepared.expiresAt - now) / 1000))}s
                remaining
              </span>
            </div>
            <dl>
              <div>
                <dt>Network</dt>
                <dd>Solana mainnet</dd>
              </div>
              <div>
                <dt>Program</dt>
                <dd>Pump · Token-2022</dd>
              </div>
              <div>
                <dt>Total supply</dt>
                <dd>
                  {(Number(prepared.totalSupply) / 1e6).toLocaleString()}{" "}
                  {prepared.symbol}
                </dd>
              </div>
              <div>
                <dt>Initial purchase</dt>
                <dd>None</dd>
              </div>
              <div>
                <dt>Estimated total cost</dt>
                <dd>{(prepared.estimatedCostLamports / 1e9).toFixed(6)} SOL</dd>
              </div>
              <div>
                <dt>Network fee estimate</dt>
                <dd>{(prepared.networkFeeLamports / 1e9).toFixed(6)} SOL</dd>
              </div>
            </dl>
            <p className="fineprint">
              Cost comes from a real transaction simulation and includes account
              rent. The final charge can vary. Token creation does not buy
              tokens for your wallet.
            </p>
            <label className="launch-consent">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>
                I’ve reviewed the public metadata. I understand token creation
                is irreversible and requires SOL.
              </span>
            </label>
            <button
              className="button primary"
              disabled={busy || !accepted || now >= prepared.expiresAt}
              onClick={() => void launch()}
            >
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Rocket size={17} />
              )}{" "}
              {busy ? "Waiting for wallet…" : "Approve & create token"}
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setPrepared(null);
                mintKey.current = null;
                setAccepted(false);
              }}
            >
              Edit details / refresh review
            </button>
          </div>
        )}
      </section>
      <aside className="launch-guide panel">
        <span className="eyebrow">YOUR IDEA. YOUR LAUNCH.</span>
        <h2>
          A clear path from
          <br />
          idea to on-chain.
        </h2>
        {[
          [
            "01",
            "Make it yours",
            "Choose a name, symbol, image, and description.",
          ],
          [
            "02",
            "Review every detail",
            "Approve public metadata and review the simulated cost.",
          ],
          [
            "03",
            "Launch with your wallet",
            "Sign the creation. We confirm it on Solana before listing it.",
          ],
        ].map(([n, title, copy]) => (
          <div className="launch-guide-step" key={n}>
            <span>{n}</span>
            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          </div>
        ))}
        <div className="launch-guide-note">
          <ShieldCheck size={18} />
          <p>
            Built with Pump’s official SDK. No initial buy, no custody, and no
            private key shared with FomoLabs.
          </p>
        </div>
        <a
          className="text-button"
          href="https://github.com/pump-fun/pump-public-docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          Protocol documentation <ArrowUpRight size={14} />
        </a>
      </aside>
    </div>
  );
}
