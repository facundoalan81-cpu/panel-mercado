"use client";

import { useEffect } from "react";
import type { Signal, Fundamental } from "@/lib/types";
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

export function DetailContent({ s, f, onClose, onAnalysis, wide, onToggleWide }: { s: Signal; f?: Fundamental | null; onClose: () => void; onAnalysis: (t: string) => void; wide?: boolean; onToggleWide?: () => void }) {
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
        <div className="ml-auto flex items-center gap-1">
          {onToggleWide && <button onClick={onToggleWide} title={wide ? "Achicar panel" : "Ampliar panel"} className="hidden cursor-pointer rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 lg:block"><Icon name={wide ? "collapse" : "expand"} size={15} /></button>}
          <button onClick={onClose} className="cursor-pointer rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"><Icon name="x" size={15} /></button>
        </div>
      </div>

      <div className="scroll-hint detail-scroll flex-1 overflow-y-scroll px-4 pb-6">
        <div className="flex items-end gap-3 py-3">
          <span className="nums text-2xl font-semibold">{fmtPrice(s.price)}</span>
          <span className="mb-0.5 text-xs text-zinc-500">{s.currency}</span>
          <span className={`nums mb-0.5 text-lg ${up ? "text-green-400" : "text-red-400"}`}>{fmtPct(s.chg_pct)}</span>
          {s.score != null && <span className="ml-auto mb-1"><ScorePips score={s.score} /></span>}
        </div>

        <button onClick={() => onAnalysis(s.ticker)} className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-violet-600/90 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-600"><Icon name="sparkles" size={15} /> Abrir modo Análisis</button>

        {s.status === "ok" && (
          <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
            {s.bias && (
              <div className="mb-1 flex items-center gap-2">
                <span className={`text-sm font-semibold ${s.bias.score >= 56 ? "text-green-400" : s.bias.score <= 44 ? "text-red-400" : "text-amber-400"}`}>{s.bias.label}</span>
                {s.bias.text && <span className="text-[11px] text-zinc-500">{s.bias.text}</span>}
              </div>
            )}
            <div className="text-xs text-zinc-300">{signalHint(s)}</div>
          </div>
        )}

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

            {s.tesis && (s.tesis.pros.length > 0 || s.tesis.cons.length > 0) && (
              <>
                <SectionTitle>Tesis · a favor y en contra</SectionTitle>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <div className="rounded-lg border border-green-500/15 bg-green-500/[0.04] px-3 py-2">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-green-400">A favor</div>
                    {s.tesis.pros.length ? s.tesis.pros.map((p) => <div key={p} className="py-0.5 text-xs text-zinc-300">+ {p}</div>) : <div className="text-xs text-zinc-600">Nada a favor ahora.</div>}
                  </div>
                  <div className="rounded-lg border border-red-500/15 bg-red-500/[0.04] px-3 py-2">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-red-400">En contra</div>
                    {s.tesis.cons.length ? s.tesis.cons.map((c) => <div key={c} className="py-0.5 text-xs text-zinc-300">− {c}</div>) : <div className="text-xs text-zinc-600">Nada en contra ahora.</div>}
                  </div>
                </div>
                {s.tesis.invalida && (
                  <div className="mt-1.5 rounded-md bg-zinc-900/50 px-2.5 py-2 text-xs text-zinc-400">
                    La lectura se debilita si pierde la <span className="font-medium text-zinc-200">{s.tesis.invalida.ref}</span> en <span className="nums text-zinc-200">{fmtPrice(s.tesis.invalida.nivel)}</span> <span className="nums text-zinc-500">({s.tesis.invalida.pct}%)</span>
                  </div>
                )}
              </>
            )}

            {s.atr && (
              <>
                <SectionTitle>Riesgo</SectionTitle>
                <div className="grid grid-cols-2 gap-1.5">
                  <KV k="Volatilidad típica (ATR)" v={`±${s.atr.pct}% / día`} accent={s.atr.pct >= 4 ? "text-red-400" : s.atr.pct >= 2.5 ? "text-amber-400" : "text-zinc-200"} />
                  <KV k="Stop sugerido (1.5×ATR)" v={fmtPrice(s.atr.stop)} />
                </div>
                <div className="mt-1.5 text-[10px] leading-snug text-zinc-600">El stop sugerido es una referencia técnica (precio − 1.5×ATR), no una recomendación. Volatilidad alta = mover posiciones más chicas.</div>
              </>
            )}
          </>
        )}

        {f && (
          <>
            <SectionTitle>La empresa en números</SectionTitle>
            {f.currency === "ARS" ? (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <KV k="Retorno 12 meses" v={f.annual_return != null ? fmtPct(f.annual_return * 100) : "—"} accent={(f.annual_return ?? 0) >= 0 ? "text-green-400" : "text-red-400"} />
                  <KV k="Margen bruto" v={f.gross_margin != null ? fmtPct(f.gross_margin * 100) : "—"} />
                </div>
                <div className="mt-1.5 rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-1.5 text-[10px] leading-snug text-amber-200/80">Balances en pesos nominales (inflación): P/E y ROE no son confiables acá. Para valuar, mirar el ADR en USD.</div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                <KV k="Valor de mercado" v={f.market_cap != null ? (f.market_cap >= 1e12 ? `${(f.market_cap / 1e12).toFixed(2)} T` : `${(f.market_cap / 1e9).toFixed(0)} B`) : "—"} />
                <KV k="P/E (precio/ganancias)" v={f.pe != null ? `${f.pe.toFixed(1)}x` : "—"} accent={f.pe != null ? (f.pe < 18 ? "text-green-400" : f.pe > 35 ? "text-red-400" : "text-zinc-200") : undefined} />
                <KV k="Crec. de ventas" v={f.rev_growth != null ? fmtPct(f.rev_growth * 100) : "—"} accent={(f.rev_growth ?? 0) > 0.1 ? "text-green-400" : (f.rev_growth ?? 0) < 0 ? "text-red-400" : undefined} />
                <KV k="ROE (rentabilidad)" v={f.roe != null ? fmtPct(f.roe * 100) : "—"} accent={(f.roe ?? 0) > 0.18 ? "text-green-400" : undefined} />
                <KV k="Margen neto" v={f.profit_margin != null ? fmtPct(f.profit_margin * 100) : "—"} accent={(f.profit_margin ?? 0) > 0.15 ? "text-green-400" : (f.profit_margin ?? 0) < 0 ? "text-red-400" : undefined} />
                <KV k="Retorno 12 meses" v={f.annual_return != null ? fmtPct(f.annual_return * 100) : "—"} accent={(f.annual_return ?? 0) >= 0 ? "text-green-400" : "text-red-400"} />
              </div>
            )}
            <button onClick={() => onAnalysis(s.ticker)} className="mt-1.5 w-full cursor-pointer rounded-md border border-zinc-800 py-1.5 text-center text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200">Ver análisis completo: ingresos, flujo de caja, historial →</button>
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
export function DetailDrawer({ s, f, onClose, onAnalysis }: { s: Signal | null; f?: Fundamental | null; onClose: () => void; onAnalysis: (t: string) => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (s) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, onClose]);
  if (!s) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[480px] border-l border-zinc-800 shadow-2xl"><DetailContent s={s} f={f} onClose={onClose} onAnalysis={onAnalysis} /></aside>
    </div>
  );
}
