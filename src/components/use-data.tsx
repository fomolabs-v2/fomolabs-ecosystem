"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Market } from "@/lib/tokens";
export function useData<T>(url: string | null, poll = 0) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(!!url),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let active = true;
    let controller: AbortController;
    setData(null);
    setLoading(true);
    setError(null);
    async function load() {
      controller = new AbortController();
      try {
        const res = await fetch(url!, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Unable to load data.");
        if (active) {
          setData(body);
          setError(null);
        }
      } catch (e) {
        if (active && !(e instanceof Error && e.name === "AbortError"))
          setError(e instanceof Error ? e.message : "Unable to load data.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const id = poll
      ? setInterval(() => {
          if (document.visibilityState === "visible") void load();
        }, poll)
      : null;
    return () => {
      active = false;
      controller?.abort();
      if (id) clearInterval(id);
    };
  }, [url, poll, revision]);
  return {
    data,
    error,
    loading,
    refresh: useCallback(() => setRevision((r) => r + 1), []),
  };
}
type MarketState = ReturnType<
  typeof useData<{ markets: Market[]; partial: boolean; fetchedAt: string }>
>;
const MarketContext = createContext<MarketState | null>(null);
export function MarketProvider({ children }: { children: ReactNode }) {
  const value = useData<{
    markets: Market[];
    partial: boolean;
    fetchedAt: string;
  }>("/api/markets", 60000);
  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  );
}
export function useMarkets() {
  return useContext(MarketContext)!;
}
export function useDebounced<T>(value: T, delay: number) {
  const [result, setResult] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setResult(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return result;
}
