"use client";

import { useEffect, useRef } from "react";

/** Widget gratuito de TradingView: chart de velas en tiempo real. */
export function TradingViewChart({ symbol, height = 300 }: { symbol: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const container = document.createElement("div");
    container.className = "tradingview-widget-container__widget";
    container.style.height = `${height}px`;
    el.appendChild(container);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      interval: "D",
      timezone: "America/Argentina/Buenos_Aires",
      theme: "dark",
      style: "1",
      locale: "es",
      autosize: true,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      backgroundColor: "#0c0c0e",
      gridColor: "rgba(255, 255, 255, 0.04)",
      withdateranges: false,
      hide_legend: false,
    });
    el.appendChild(script);

    return () => {
      el.innerHTML = "";
    };
  }, [symbol, height]);

  return (
    <div
      ref={ref}
      className="tradingview-widget-container overflow-hidden rounded-lg border border-zinc-800"
      style={{ height }}
    />
  );
}
