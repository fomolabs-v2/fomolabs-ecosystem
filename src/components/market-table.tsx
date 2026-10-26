"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Star, ChevronDown } from "lucide-react";
import { type Market, money } from "@/lib/tokens";
import { TokenIcon, Change } from "./ui";
export function MarketTable({
  markets,
  onlySaved = false,
  compact = false,
}: {
  markets: Market[];
  onlySaved?: boolean;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState<string[]>([]),
    [sort, setSort] = useState<"volume" | "change" | "liquidity">("volume");
  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem("fomo-watchlist") || "[]"));
    } catch {}
  }, []);
  function toggle(mint: string) {
    const next = saved.includes(mint)
      ? saved.filter((a) => a !== mint)
      : [...saved, mint];
    setSaved(next);
    localStorage.setItem("fomo-watchlist", JSON.stringify(next));
  }
  const rows = markets
    .filter((m) => !onlySaved || saved.includes(m.token.address))
    .sort((a, b) => b[sort] - a[sort]);
  return (
    <div className="table-scroll">
      <table className={`market-table ${compact ? "compact" : ""}`}>
        <thead>
          <tr>
            <th className="star-cell" />
            <th>Token</th>
            <th>Price</th>
            <th>
              <button onClick={() => setSort("change")}>
                24h change {sort === "change" && <ChevronDown size={12} />}
              </button>
            </th>
            <th className="hide-small">
              <button onClick={() => setSort("volume")}>
                24h volume {sort === "volume" && <ChevronDown size={12} />}
              </button>
            </th>
            <th className="hide-medium">
              <button onClick={() => setSort("liquidity")}>
                Liquidity {sort === "liquidity" && <ChevronDown size={12} />}
              </button>
            </th>
            <th className="table-action" />
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.token.address}>
              <td className="star-cell">
                <button
                  className={`icon-button star-button ${saved.includes(m.token.address) ? "saved" : ""}`}
                  onClick={() => toggle(m.token.address)}
                  aria-label={`${saved.includes(m.token.address) ? "Remove" : "Add"} ${m.token.symbol} ${saved.includes(m.token.address) ? "from" : "to"} watchlist`}
                  aria-pressed={saved.includes(m.token.address)}
                >
                  <Star size={14} />
                </button>
              </td>
              <td>
                <Link
                  className="table-token"
                  href={`/trade?token=${m.token.address}`}
                >
                  <TokenIcon token={m.token} />
                  <span>
                    <strong>
                      {m.token.symbol}
                      {m.token.symbol === "FOMO" && (
                        <b className="table-tag">ECOSYSTEM</b>
                      )}
                    </strong>
                    <small>{m.token.name}</small>
                  </span>
                </Link>
              </td>
              <td>{money(m.price)}</td>
              <td>
                <Change value={m.change} />
              </td>
              <td className="hide-small">{money(m.volume, true)}</td>
              <td className="hide-medium">{money(m.liquidity, true)}</td>
              <td className="table-action">
                <Link
                  href={`/trade?token=${m.token.address}`}
                  aria-label={`Trade ${m.token.symbol}`}
                >
                  <span>Trade</span>
                  <ArrowUpRight size={15} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="table-empty">
          Star a token to add it to your watchlist.
        </div>
      )}
    </div>
  );
}
