"use client";
import { useId } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { CopyButton, LiveBadge } from "@/components/ui";
import { useData } from "./use-data";
import { FOMO, money } from "@/lib/tokens";

type VolumeData = {
  volumeUsd: number | null;
  swaps: number;
  unpriced: number;
  pending: number;
  buckets: { start: number; usd: number; swaps: number }[];
  trackingSince: number;
  fullWindow: boolean;
  updatedAt: number;
};

export function DexVolumeCard() {
  const id = useId();
  const { data, error, loading, refresh } = useData<VolumeData>(
    "/api/volume",
    60000,
  );
  const available = data && !error;
  const max = Math.max(1, ...(available ? data.buckets.map((b) => b.usd) : []));
  return (
    <section className="dex-volume panel" aria-labelledby={`${id}-title`}>
      <div className="dex-volume-main">
        <div className="dex-volume-heading">
          <h2 id={`${id}-title`}>Volume 24H</h2>
          <span className="dex-volume-label">FOMO DEX</span>
          {available && <LiveBadge>Live</LiveBadge>}
        </div>
        <div className="dex-volume-number">
          <strong>{available ? money(data.volumeUsd, true) : "—"}</strong>
          <span>
            {available
              ? `${data.swaps.toLocaleString()} confirmed ${data.swaps === 1 ? "swap" : "swaps"}`
              : loading
                ? "Loading trading volume…"
                : "Volume unavailable"}
          </span>
          <button
            className="icon-button"
            aria-label="Refresh FOMO DEX volume"
            title="Refresh volume"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={16} />
          </button>
        </div>
        {available ? (
          <>
            <svg
              className="dex-volume-chart"
              viewBox="0 0 360 60"
              preserveAspectRatio="none"
              role="img"
              aria-labelledby={`${id}-chart-title`}
            >
              <title id={`${id}-chart-title`}>
                Confirmed FOMO DEX swap volume by hour over the last 24 hours
              </title>
              <defs>
                <linearGradient
                  id={`${id}-gradient`}
                  x1="0"
                  y1="1"
                  x2="0"
                  y2="0"
                >
                  <stop stopColor="#4e9bff" />
                  <stop offset="1" stopColor="#43e5eb" />
                </linearGradient>
              </defs>
              <path d="M0 59H360" stroke="#36435a" />
              {data.buckets.map((bucket, index) => {
                const height = (bucket.usd / max) * 54;
                return (
                  <rect
                    key={bucket.start}
                    x={index * 15 + 2}
                    y={59 - height}
                    width="10"
                    height={height}
                    rx="2"
                    fill={`url(#${id}-gradient)`}
                  >
                    <title>
                      {new Date(bucket.start).toLocaleString()} ·{" "}
                      {money(bucket.usd)} · {bucket.swaps} swaps
                    </title>
                  </rect>
                );
              })}
            </svg>
            <div className="dex-volume-range">
              <span>24 hours ago</span>
              <span>Now</span>
            </div>
            <p>
              {data.swaps === 0
                ? "No confirmed swaps recorded in this window."
                : "Confirmed swaps through FOMO DEX. USD value at execution."}
            </p>
            {!data.fullWindow && (
              <p className="dex-volume-coverage">
                Tracking since{" "}
                {new Date(data.trackingSince).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                . Earlier activity is not included.
              </p>
            )}
            {data.unpriced > 0 && (
              <p>
                {data.unpriced} confirmed{" "}
                {data.unpriced === 1 ? "swap needs" : "swaps need"} USD pricing.
              </p>
            )}
            {data.pending > 0 && (
              <p>
                {data.pending} submitted{" "}
                {data.pending === 1 ? "swap awaiting" : "swaps awaiting"}{" "}
                confirmation.
              </p>
            )}
          </>
        ) : (
          <p>
            {error
              ? "Trading data is temporarily unavailable. Tap refresh to retry."
              : "Counting confirmed trades on the platform."}
          </p>
        )}
      </div>
      <div className="dex-volume-contract">
        <div className="dex-volume-contract-title">
          <img src="/brand/icon-192.png" width="32" height="32" alt="" />
          <div>
            <strong>FOMO</strong>
            <span>Solana contract address (CA)</span>
          </div>
        </div>
        <code>{FOMO}</code>
        <div className="dex-volume-contract-actions">
          <CopyButton value={FOMO} label="Copy CA" />
          <a
            href={`https://solscan.io/token/${FOMO}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Solscan <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
