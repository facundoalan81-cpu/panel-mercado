"use client";

import { useEffect, useRef } from "react";

/** Widget gratuito de TradingView: rating técnico multi-timeframe (confluencia). */
export function TradingViewTechnicals({ symbol, height = 400 }: { symbol: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const container = document.createElement("div");
    container.className = "tradingview-widget-container__widget";
    el.appendChild(container);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: "1D",
      width: "100%",
      isTransparent: true,
      height,
      symbol,
      showIntervalTabs: true,
      displayMode: "multiple",
      locale: "es",
      colorTheme: "dark",
    });
    el.appendChild(script);

    return () => {
      el.innerHTML = "";
    };
  }, [symbol, height]);

  return <div ref={ref} className="tradingview-widget-container" style={{ minHeight: height }} />;
}
