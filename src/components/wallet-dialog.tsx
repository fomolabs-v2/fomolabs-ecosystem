"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { useWallet, type Wallet } from "@solana/wallet-adapter-react";
import { WalletModalContext } from "@solana/wallet-adapter-react-ui";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Modal, DataError } from "./ui";
import {
  WALLET_OPTIONS,
  walletBrowseLink,
  walletConnectionError,
  type WalletOption,
} from "@/lib/wallet-options";
import { toast } from "sonner";

export function WalletConnectionProvider({
  children,
  error,
  clearError,
}: {
  children: ReactNode;
  error: string | null;
  clearError: () => void;
}) {
  const [visible, setVisible] = useState(false),
    [guide, setGuide] = useState<WalletOption | null>(null),
    [switching, setSwitching] = useState(false);
  const {
    wallets,
    wallet,
    select,
    connect,
    connected,
    connecting,
    disconnect,
    publicKey,
  } = useWallet();
  const requestedWallet = useRef<string | null>(null);
  useEffect(() => {
    if (wallet && requestedWallet.current === wallet.adapter.name) {
      requestedWallet.current = null;
      // Let WalletProvider attach its new adapter listeners before a synchronous connect event.
      void Promise.resolve()
        .then(() => connect())
        .catch(() => {
          /* WalletProvider reports the connection error. */
        });
    }
  }, [wallet, connect]);
  useEffect(() => {
    if (connected) {
      setVisible(false);
      setSwitching(false);
    }
  }, [connected]);
  useEffect(() => {
    if (error && !connected) setVisible(true);
  }, [error, connected]);
  const open = (value: boolean) => {
    setVisible(value);
    if (value) {
      setGuide(null);
      setSwitching(false);
      clearError();
    }
  };
  const available = wallets.filter(
    (w) => w.readyState === "Installed" || w.readyState === "Loadable",
  );
  async function choose(item: Wallet) {
    // Release the dialog's focus and pointer lock before a wallet opens its own overlay.
    clearError();
    setGuide(null);
    setVisible(false);
    if (wallet?.adapter.name === item.adapter.name) {
      try {
        await connect();
      } catch {
        /* Provider shows the error and permits retry. */
      }
    } else {
      requestedWallet.current = item.adapter.name;
      select(item.adapter.name);
    }
  }
  const match = (option: WalletOption) =>
    wallets.find((w) =>
      option.aliases.some(
        (name) => name.toLowerCase() === w.adapter.name.toLowerCase(),
      ),
    );
  const browseLink =
    guide && typeof window !== "undefined"
      ? walletBrowseLink(guide.name, window.location.href)
      : null;
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        window.location.origin +
          window.location.pathname +
          window.location.search,
      );
      toast.success("Site link copied");
    } catch {
      toast.error("Copy unavailable. Use the site address below.");
    }
  }
  return (
    <WalletModalContext.Provider value={{ visible, setVisible: open }}>
      {children}
      <Modal
        open={visible}
        onOpenChange={open}
        title={
          guide
            ? `Use ${guide.name}`
            : connected && !switching
              ? "Your wallet"
              : "Connect your wallet"
        }
        description={
          guide
            ? "Open FomoLabs inside your wallet to connect on mobile."
            : "Connect a Solana account. Every swap needs a separate approval in your wallet."
        }
        className="wallet-dialog"
      >
        {connected && !switching && publicKey ? (
          <div className="wallet-account">
            <span className="live-badge">
              <i /> Connected · Solana mainnet
            </span>
            <strong>{wallet?.adapter.name}</strong>
            <code>{publicKey.toBase58()}</code>
            <button
              className="button secondary full-width"
              onClick={async () => {
                await navigator.clipboard.writeText(publicKey.toBase58()).then(
                  () => toast.success("Address copied"),
                  () => toast.error("Copy unavailable"),
                );
              }}
            >
              <Copy size={16} /> Copy address
            </button>
            <button
              className="button secondary full-width"
              onClick={async () => {
                await disconnect();
                setSwitching(true);
              }}
            >
              Change wallet
            </button>
            <button
              className="text-button"
              onClick={async () => {
                await disconnect();
                setVisible(false);
              }}
            >
              <LogOut size={15} /> Disconnect
            </button>
          </div>
        ) : guide ? (
          <div className="wallet-guide">
            <div className="wallet-guide-icon">
              <Smartphone size={28} />
            </div>
            <p>
              On your phone, open {guide.name}, find its browser or Explore
              section, and open:
            </p>
            <code>
              {typeof window !== "undefined"
                ? window.location.origin
                : "https://fomolabs-ecosystem.vercel.app"}
            </code>
            {browseLink && (
              <a className="button primary full-width" href={browseLink}>
                Open in {guide.name}
                <ArrowUpRight size={16} />
              </a>
            )}
            <button className="button secondary full-width" onClick={copyLink}>
              <Copy size={16} /> Copy FomoLabs link
            </button>
            <p>
              Choose your Solana account, then tap Connect wallet again. For
              desktop, enable the wallet extension and reload this page.
            </p>
            <a
              className="text-link"
              href={guide.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get {guide.name} from its official site
              <ArrowUpRight size={14} />
            </a>
            <button className="text-button" onClick={() => setGuide(null)}>
              <ArrowLeft size={15} /> All wallets
            </button>
          </div>
        ) : (
          <>
            {connecting && (
              <div className="wallet-pending" role="status">
                <LoaderCircle className="spin" size={19} />
                <span>
                  Approve the connection in{" "}
                  {wallet?.adapter.name || "your wallet"}.
                  <small>No transaction is being requested.</small>
                </span>
              </div>
            )}
            {error && <DataError error={walletConnectionError(error)} />}
            {!!available.length && (
              <>
                <span className="eyebrow muted">AVAILABLE IN THIS BROWSER</span>
                <div className="wallet-options">
                  {available.map((item) => (
                    <button
                      key={item.adapter.name}
                      disabled={connecting}
                      onClick={() => void choose(item)}
                    >
                      <img src={item.adapter.icon} alt="" />
                      <span>
                        <strong>{item.adapter.name}</strong>
                        <small>
                          {item.readyState === "Installed"
                            ? "Detected · Solana"
                            : "Open wallet connection"}
                        </small>
                      </span>
                      <Check size={16} />
                    </button>
                  ))}
                </div>
              </>
            )}
            <span className="eyebrow muted">
              {available.length ? "MORE WALLETS" : "CHOOSE YOUR WALLET"}
            </span>
            <div className="wallet-options">
              {WALLET_OPTIONS.filter(
                (option) =>
                  !available.some((w) =>
                    option.aliases.some(
                      (name) =>
                        name.toLowerCase() === w.adapter.name.toLowerCase(),
                    ),
                  ),
              ).map((option) => {
                const item = match(option);
                return (
                  <button
                    key={option.name}
                    disabled={connecting}
                    onClick={() =>
                      item &&
                      (item.readyState === "Installed" ||
                        item.readyState === "Loadable")
                        ? void choose(item)
                        : setGuide(option)
                    }
                  >
                    <span
                      className="wallet-monogram"
                      style={{ color: option.color }}
                    >
                      {option.mark}
                    </span>
                    <span>
                      <strong>{option.name}</strong>
                      <small>Mobile app or browser extension</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                );
              })}
            </div>
            <p className="fineprint">
              Other compatible Solana wallets appear automatically when
              detected. Use the latest wallet version for transaction signing.
            </p>
          </>
        )}
        <p className="wallet-assurance">
          <ShieldCheck size={15} /> We never ask for your recovery phrase.
        </p>
      </Modal>
    </WalletModalContext.Provider>
  );
}
