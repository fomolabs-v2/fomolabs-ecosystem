"use client";
import { type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  ArrowUpRight,
  Wallet,
  Check,
  Copy,
  RefreshCw,
  CircleAlert,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { toast } from "sonner";
import { shortAddress, type Token } from "@/lib/tokens";
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "small" : ""}`}>
      <img src="/brand/logo.webp" alt="" width="42" height="42" />
      <span>
        Fomo<span>Labs</span>
        <sup>®</sup>
      </span>
    </span>
  );
}
export function TokenIcon({
  token,
  small = false,
}: {
  token: Pick<Token, "symbol" | "icon">;
  small?: boolean;
}) {
  return (
    <span
      className={`token-icon token-${token.symbol.toLowerCase()} ${small ? "small" : ""}`}
      aria-hidden="true"
    >
      {token.symbol === "FOMO" ? (
        <img src="/brand/icon-192.png" alt="" />
      ) : token.symbol === "SOL" ? (
        <span className="sol-mark">
          <i />
          <i />
          <i />
        </span>
      ) : token.icon ? (
        <img
          src={token.icon}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : token.symbol === "USDC" ? (
        "$"
      ) : (
        token.symbol.slice(0, 1)
      )}
    </span>
  );
}
export function ConnectButton({ compact = false }: { compact?: boolean }) {
  const { connected, publicKey, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  return (
    <button
      className={`button ${connected ? "secondary" : "primary"} wallet-button`}
      onClick={() => setVisible(true)}
      title={
        connected ? "Manage connected wallet" : "Connect your Solana wallet"
      }
      aria-label={
        connecting
          ? "Connecting wallet"
          : connected
            ? "Manage connected wallet"
            : "Connect wallet"
      }
    >
      <Wallet size={16} />
      <span>
        {connecting
          ? "Connecting…"
          : connected && publicKey
            ? shortAddress(publicKey.toBase58())
            : compact
              ? "Connect"
              : "Connect wallet"}
      </span>
    </button>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = "",
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={`modal ${className}`}>
          <div className="modal-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={19} />
            </Dialog.Close>
          </div>
          <Dialog.Description
            className={description ? "modal-description" : "sr-only"}
          >
            {description || title}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function CopyButton({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  return (
    <button
      className="text-button copy-button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success("Address copied");
        } catch {
          toast.error("Copy unavailable. Select the address manually.");
        }
      }}
      aria-label={label || "Copy address"}
    >
      <Copy size={13} />
      {label}
    </button>
  );
}
export function Change({ value }: { value: number }) {
  return (
    <span className={value >= 0 ? "positive" : "negative"}>
      {value >= 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}
export function LiveBadge({
  children = "Live on Solana",
}: {
  children?: ReactNode;
}) {
  return (
    <span className="live-badge">
      <i />
      {children}
    </span>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon || <CircleAlert size={25} />}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function DataError({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  return (
    <div className="data-error" role="status">
      <CircleAlert size={16} />
      <span>{error}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </div>
  );
}
export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      className="text-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}
