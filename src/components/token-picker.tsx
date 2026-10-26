"use client";
import { useState } from "react";
import { Search, ChevronDown, Check, ShieldCheck } from "lucide-react";
import { TokenIcon, Modal, DataError } from "./ui";
import { useData, useDebounced } from "./use-data";
import { TOKENS, type Token, shortAddress } from "@/lib/tokens";
export function TokenPicker({
  token,
  onChange,
  label = "Select token",
  expanded = false,
}: {
  token: Token;
  onChange: (token: Token) => void;
  label?: string;
  expanded?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const debounced = useDebounced(query, 500);
  const { data, error, loading, refresh } = useData<{ tokens: Token[] }>(
    open && debounced ? `/api/tokens?q=${encodeURIComponent(debounced)}` : null,
  );
  const tokens = debounced ? data?.tokens || [] : TOKENS;
  return (
    <>
      <button
        className={`token-selector ${expanded ? "expanded" : ""}`}
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <TokenIcon token={token} small />
        <strong>{token.symbol}</strong>
        {expanded && <span>/ USD</span>}
        <ChevronDown size={14} />
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Choose a token"
        description="Search Solana tokens by name or mint address. Always verify the mint before trading."
      >
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or paste mint address"
            autoFocus
            aria-label="Search tokens"
          />
        </label>
        <div className="token-chips">
          {TOKENS.slice(0, 4).map((t) => (
            <button
              key={t.address}
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
            >
              <TokenIcon token={t} small />
              {t.symbol}
            </button>
          ))}
        </div>
        <span className="eyebrow muted">
          {query ? "SEARCH RESULTS" : "QUICK SELECT"}
        </span>
        {loading && <p className="loading-text">Finding tokens…</p>}
        {error && <DataError error={error} retry={refresh} />}
        <div className="token-results">
          {tokens.map((t) => (
            <button
              key={t.address}
              className="token-result"
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
            >
              <TokenIcon token={t} />
              <span>
                <strong>
                  {t.symbol}
                  {t.verified && <ShieldCheck size={13} className="cyan" />}
                </strong>
                <small>
                  {t.name} · {shortAddress(t.address)}
                </small>
              </span>
              {token.address === t.address && <Check size={17} />}
            </button>
          ))}
          {!loading && !error && !tokens.length && (
            <p className="loading-text">No matching tokens found.</p>
          )}
        </div>
        <p className="fineprint">
          Search data by Jupiter. A verification badge is not a guarantee of
          safety or value.
        </p>
      </Modal>
    </>
  );
}
