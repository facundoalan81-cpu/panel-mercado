"use client";

import { useEffect } from "react";
import type { Signal } from "@/lib/types";
import { CLASS_META, COUNTRY_META, fmtPct, fmtPrice, signalHint } from "@/lib/format";
import { ClassBadge, ScorePips, MAsGlyph } from "./bits";
import { Logo } from "./Logo";
import { Icon } from "./Icons";
import { TradingViewChart } from "./TradingViewChart";
import { TradingViewTechnicals } from "./TradingViewTechnicals";

function KV({ k, v, accent }: { k: string; v: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between rounded-md bg-zinc-900/50 px-2.5 py-1.5">
      <span className="text-[11px] uppercase tracking-wide text-zinc-500">{k}</span>
      <span className={`nums text-sm ${accent ?? "text-zinc-200"}`}>{v}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">{children}</h3>;
}

export function DetailContent({ s, onClose, onAnalysis }: { s: Signal; onClose: () => void; onAnalysis: (t: string) => void }) {
  const o = s.ohlc;
  const up = (s.chg_pct ?? 0) >= 0;
  const rangePos = o && o.high != null && o.low != null && s.price != null && o.high !== o.low ? ((s.price - o.low) / (o.high - o.low)) * 100 : null;
  const vsOpen = o && o.open != null && s.price != null ? (s.price / o.open - 1) * 100 : null;
  const dist = (ma?: number) => (ma != null && s.price != null ? fmtPct((s.price / ma - 1) * 100) : "—");

  return (
    <div className="flex h-full flex-col bg-[#0a0a0c]">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
        <Logo s={s} size={24} />
        <span className="text-base font-semibold">{s.ticker}</span>
        <ClassBadge s={s} full />
        <span className="text-xs text-zinc-600">1D</span>
        <button onClick={onClose} className="ml-auto cursor-pointer rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"><Icon name="x" size={15} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="flex items-end gap-3 py-3">
          <span className="nums text-2xl font-semibold">{fmtPrice(s.price)}</span>
          <span className="mb-0.5 text-xs text-zinc-500">{s.currency}</span>
          <span className={`nums mb-0.5 text-lg ${up ? "text-green-400" : "text-red-400"}`}>{fmtPct(s.chg_pct)}</span>
          {s.score != null && <span className="ml-auto mb-1"><ScorePips score={s.score} /></span>}
        </div>

        <button onClick={() => onAnalysis(s.ticker)} className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-violet-600/90 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-600"><Icon name="sparkles" size={15} /> Abrir modo Análisis</button>

        {s.status === "ok" && <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-300">{signalHint(s)}</div>}

        <TradingViewChart symbol={s.tv} height={260} />

        {s.status === "ok" && (
          <>
            <SectionTitle>Lectura técnica · {CLASS_META[s.classification].label}</SectionTitle>
            <div className="grid grid-cols-2 gap-1.5">
              <KV k="Score" v={`${s.score}/5`} accent={(s.score ?? 0) >= 4 ? "text-green-400" : undefined} />
              <KV k="RSI(14)" v={s.rsi?.toFixed(1)} />
              <KV k="MACD" v={s.macd?.state} accent={s.macd?.state === "alcista" ? "text-green-400" : s.macd?.state === "bajista" ? "text-red-400" : undefined} />
              <KV k="SuperTrend" v={s.supertrend?.dir === "up" ? "Up" : s.supertrend?.dir === "down" ? "Down" : "—"} accent={s.supertrend?.dir === "up" ? "text-green-400" : "text-red-400"} />
              <KV k="Volumen (CMF)" v={s.money_flow} accent={s.money_flow === "entrada" ? "text-green-400" : s.money_flow === "salida" ? "text-red-400" : undefined} />
              <KV k="BBP" v={s.bbp?.state === "bull" ? "Bull" : s.bbp?.state === "bear" ? "Bear" : "—"} accent={s.bbp?.state === "bull" ? "text-green-400" : "text-red-400"} />
              <KV k="Horizonte corto" v={s.horizon?.corto} accent={s.horizon?.corto === "alcista" ? "text-green-400" : s.horizon?.corto === "bajista" ? "text-red-400" : undefined} />
              <KV k="Horizonte largo" v={s.horizon?.largo} accent={s.horizon?.largo === "alcista" ? "text-green-400" : s.horizon?.largo === "bajista" ? "text-red-400" : undefined} />
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md bg-zinc-900/50 px-2.5 py-2">
              <span className="text-[11px] uppercase tracking-wide text-zinc-500">vs medias 20/30/150/200</span>
              <div className="flex items-center gap-3"><MAsGlyph s={s} /><span className="nums text-xs text-zinc-400">{dist(s.mas?.ema20)} · {dist(s.mas?.sma30)} · {dist(s.mas?.ema150)} · {dist(s.mas?.ema200)}</span></div>
            </div>
          </>
        )}

        <SectionTitle>Confluencia técnica</SectionTitle>
        <div className="overflow-hidden rounded-lg border border-zinc-800"><TradingViewTechnicals symbol={s.tv} height={380} /></div>

        {o && (
          <>
            <SectionTitle>Cotización</SectionTitle>
            <div className="grid grid-cols-2 gap-1.5">
              <KV k="Apertura" v={fmtPrice(o.open)} />
              <KV k="Cierre ant." v={fmtPrice(o.prev_close)} />
              <KV k="Máximo" v={fmtPrice(o.high)} accent="text-green-400/90" />
              <KV k="Mínimo" v={fmtPrice(o.low)} accent="text-red-400/90" />
            </div>
            {rangePos != null && (
              <div className="mt-2 rounded-md bg-zinc-900/50 px-2.5 py-2">
                <div className="mb-1.5 flex justify-between text-[11px] text-zinc-500"><span>Posición en rango del día</span><span className="nums text-zinc-300">{rangePos.toFixed(0)}%</span></div>
                <div className="relative h-1.5 rounded-full bg-zinc-800"><div className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-full bg-zinc-200" style={{ left: `${rangePos}%` }} /></div>
              </div>
            )}
            {vsOpen != null && <div className="mt-1.5"><KV k="Vs. apertura" v={fmtPct(vsOpen)} accent={vsOpen >= 0 ? "text-green-400" : "text-red-400"} /></div>}
          </>
        )}

        <a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(s.tv)}`} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center justify-center gap-1 text-center text-xs text-zinc-500 hover:text-zinc-300">Abrir en TradingView <Icon name="external" size={11} /></a>
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">Chart y confluencia: TradingView (tiempo real). Señal propia: cierre diario. No es recomendación de inversión.</p>
      </div>
    </div>
  );
}

/** Overlay para pantallas chicas (en desktop el detalle va en panel fijo). */
export function DetailDrawer({ s, onClose, onAnalysis }: { s: Signal | null; onClose: () => void; onAnalysis: (t: string) => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (s) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, onClose]);
  if (!s) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[480px] border-l border-zinc-800 shadow-2xl"><DetailContent s={s} onClose={onClose} onAnalysis={onAnalysis} /></aside>
    </div>
  );
}
