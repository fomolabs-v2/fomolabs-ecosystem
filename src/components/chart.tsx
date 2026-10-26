"use client";
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  type UTCTimestamp,
  type LogicalRange,
} from "lightweight-charts";
import { Expand, ChartCandlestick, RefreshCw } from "lucide-react";
import { useData } from "./use-data";
import { DataError } from "./ui";
import { type Market, type Candle, money } from "@/lib/tokens";
export function PriceChart({
  market,
  compact = false,
}: {
  market: Market | null;
  compact?: boolean;
}) {
  const [interval, setInterval] = useState("1h"),
    [volume, setVolume] = useState(true),
    [lastCandle, setLastCandle] = useState<Candle | null>(null);
  const target = useRef<HTMLDivElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const viewport = useRef<{ key: string; range: LogicalRange | null } | null>(null);
  const { data, error, loading, refresh } = useData<{
    candles: Candle[];
    fetchedAt: string;
  }>(
    market ? `/api/chart?pool=${market.pool}&interval=${interval}` : null,
    60000,
  );
  useEffect(() => {
    if (!target.current || !data?.candles?.length) {
      setLastCandle(null);
      return;
    }
    const chart = createChart(target.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#76849d",
        fontSize: 10,
        fontFamily: "Inter, sans-serif",
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "#17203360" },
        horzLines: { color: "#172033a0" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: volume ? 0.24 : 0.08 },
      },
      timeScale: {
        borderColor: "#1c2436",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: compact ? 5 : 7,
      },
      crosshair: {
        vertLine: { color: "#73839780" },
        horzLine: { color: "#73839780" },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
    });
    const precision =
      market && market.price < 0.001 ? 9 : market && market.price < 1 ? 6 : 2;
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#31d6b2",
      downColor: "#f26c91",
      borderVisible: false,
      wickUpColor: "#31d6b2",
      wickDownColor: "#f26c91",
      priceFormat: { type: "price", precision, minMove: 10 ** -precision },
    });
    series.setData(
      data.candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })),
    );
    if (volume) {
      const hist = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
        lastValueVisible: false,
        priceLineVisible: false,
      });
      hist
        .priceScale()
        .applyOptions({
          scaleMargins: { top: 0.84, bottom: 0 },
          visible: false,
        });
      hist.setData(
        data.candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? "#31d6b22b" : "#f26c912b",
        })),
      );
    }
    const viewportKey = `${market?.pool}:${interval}`;
    if (viewport.current?.key === viewportKey && viewport.current.range) chart.timeScale().setVisibleLogicalRange(viewport.current.range);
    else chart.timeScale().fitContent();
    setLastCandle(data.candles.at(-1) || null);
    chart.subscribeCrosshairMove((param) => {
      const hovered = param.seriesData.get(series) as Candle | undefined;
      setLastCandle(
        hovered?.open != null ? hovered : data.candles.at(-1) || null,
      );
    });
    return () => { viewport.current = { key: viewportKey, range: chart.timeScale().getVisibleLogicalRange() }; chart.remove(); };
  }, [data, volume, compact, market, interval]);
  return (
    <div
      className={`chart-panel ${compact ? "compact-chart" : ""}`}
      ref={panel}
    >
      <div className="chart-toolbar">
        <div className="timeframes" role="group" aria-label="Chart timeframe">
          {["5m", "15m", "1h", "4h", "1D"].map((frame) => (
            <button
              key={frame}
              className={interval === frame ? "active" : ""}
              onClick={() => setInterval(frame)}
              aria-pressed={interval === frame}
            >
              {frame}
            </button>
          ))}
        </div>
        <div className="chart-tools">
          <button
            className={`text-button ${volume ? "selected" : ""}`}
            onClick={() => setVolume(!volume)}
            aria-pressed={volume}
          >
            Volume
          </button>
          <button
            className="icon-button"
            onClick={refresh}
            aria-label="Refresh chart"
          >
            <RefreshCw size={14} />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void panel.current?.requestFullscreen?.();
            }}
            aria-label="Expand chart"
          >
            <Expand size={15} />
          </button>
        </div>
      </div>
      <div className="chart-ohlc">
        <span>{market?.token.symbol || "SOL"} / USD</span>
        {lastCandle && (
          <>
            <span>
              O <b>{money(lastCandle.open)}</b>
            </span>
            <span>
              H <b>{money(lastCandle.high)}</b>
            </span>
            <span>
              L <b>{money(lastCandle.low)}</b>
            </span>
            <span>
              C{" "}
              <b
                className={
                  lastCandle.close >= lastCandle.open ? "positive" : "negative"
                }
              >
                {money(lastCandle.close)}
              </b>
            </span>
          </>
        )}
      </div>
      <div className="chart-canvas" ref={target} />
      {(loading || !market) && (
        <div className="chart-overlay">
          <div className="loading-orbit" />
          <p>Loading live candles</p>
        </div>
      )}
      {error && (
        <div className="chart-overlay">
          <DataError error={error} retry={refresh} />
        </div>
      )}
      {!loading && !error && market && data && data.candles.length === 0 && (
        <div className="chart-overlay">
          <ChartCandlestick size={32} />
          <p>No candles available for this interval.</p>
        </div>
      )}
      <div className="chart-credit">
        <span>Pool price · GeckoTerminal</span>
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Charts by TradingView
        </a>
      </div>
    </div>
  );
}
