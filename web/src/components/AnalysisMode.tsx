"use client";

import { useMemo, useState } from "react";
import type { Signal, Fundamental, Fundamentals } from "@/lib/types";
import { fmtPrice, fmtPct } from "@/lib/format";
import { ClassBadge } from "./bits";
import { Logo } from "./Logo";
import { FundChart } from "./FundChart";

function marketCap(n: number | null): string {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n}`;
}
const pctTxt = (v: number | null, d = 0) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(d)}%`);
const pctCol = (v: number | null) => (v == null ? "text-zinc-300" : v >= 0 ? "text-green-400" : "text-red-400");

function Kpi({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`nums mt-1.5 text-2xl font-semibold ${accent ?? "text-zinc-100"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-zinc-600">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{title}</div>
      {sub && <div className="mb-1 text-[11px] text-zinc-600">{sub}</div>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function AnalysisMode({
  s,
  f,
  all,
  funds,
  onSelect,
  onClose,
}: {
  s: Signal;
  f: Fundamental | null;
  all: Signal[];
  funds: Fundamentals;
  onSelect: (ticker: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"resumen" | "financials">("resumen");
  const [expand, setExpand] = useState(false);
  const up = (s.chg_pct ?? 0) >= 0;

  // Pares del MISMO sector (no papeles random). Orden estable: primero los que tienen
  // fundamentals, después alfabético -> no se reordena por % al tocar uno.
  const rail = useMemo(
    () =>
      all
        .filter((x) => x.ticker !== s.ticker && x.asset_class === "stock" && x.sector === s.sector)
        .sort((a, b) => (Number(!!funds[b.ticker]) - Number(!!funds[a.ticker])) || a.ticker.localeCompare(b.ticker))
        .slice(0, 24),
    [all, funds, s.ticker, s.sector],
  );

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#09090b]">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5 p-4 lg:flex-row lg:p-6">
        {/* MAIN */}
        <div className="min-w-0 flex-1 space-y-5">
          {/* ficha empresa */}
          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-900/20 p-5">
            <div className="flex flex-wrap items-start gap-4">
              <Logo s={s} size={64} />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">Cierre</span>
                  <ClassBadge s={s} full />
                </div>
                <h1 className="truncate text-3xl font-semibold tracking-tight">{f?.name ?? s.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {f?.website && (
                    <a href={f.website} target="_blank" rel="noopener noreferrer" className="rounded-md border border-zinc-700 px-2 py-0.5 text-zinc-400 hover:text-zinc-200">
                      ↗ {f.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                  {f?.sector && <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-sky-300">{f.sector}</span>}
                  {f?.industry && <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-violet-300">{f.industry}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Market cap</div>
                <div className="nums text-lg font-semibold">{marketCap(f?.market_cap ?? null)}</div>
                <div className="nums mt-2 text-4xl font-bold">{fmtPrice(s.price)}</div>
                <div className={`nums text-lg ${up ? "text-green-400" : "text-red-400"}`}>{fmtPct(s.chg_pct)}</div>
              </div>
            </div>
            {f?.summary && (
              <div className="mt-4 border-t border-zinc-800 pt-4 text-sm leading-relaxed text-zinc-400">
                <p className={expand ? "" : "line-clamp-3"}>{f.summary}</p>
                <button onClick={() => setExpand((v) => !v)} className="mt-1 text-xs text-zinc-500 hover:text-zinc-300">
                  {expand ? "Ver menos" : "Ver más"}
                </button>
              </div>
            )}
          </div>

          {/* tabs */}
          <div className="flex gap-1">
            {([["resumen", "Resumen"], ["financials", "Financials"]] as const).map(([id, lbl]) => (
              <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-4 py-2 text-sm transition ${tab === id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>
                {lbl}
              </button>
            ))}
          </div>

          {!f ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
              Sin datos fundamentales para este activo (cripto / commodity / índice o no disponible).
            </div>
          ) : tab === "resumen" ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi label="Retorno anual" value={pctTxt(f.annual_return)} sub="Últimos 12 meses" accent={pctCol(f.annual_return)} />
                <Kpi label="Gross margin" value={pctTxt(f.gross_margin)} sub="Últimos 12 meses" accent={pctCol(f.gross_margin)} />
                <Kpi label="FCF margin" value={pctTxt(f.fcf_margin)} sub="Flujo libre / ventas" accent={pctCol(f.fcf_margin)} />
                <Kpi label="EV / EBITDA" value={f.ev_ebitda != null ? `${f.ev_ebitda.toFixed(1)}x` : "—"} sub="Valuación" />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <ChartCard title="Ingresos" sub="Anual (miles de M)"><FundChart data={f.revenue} color="#60a5fa" /></ChartCard>
                <ChartCard title="Free cash flow" sub="Anual (miles de M)"><FundChart data={f.fcf} color="#34d399" /></ChartCard>
                <ChartCard title="Dilución" sub="Acciones en circulación (M)"><FundChart data={f.shares} color="#f59e0b" /></ChartCard>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi label="P/E" value={f.pe != null ? f.pe.toFixed(1) : "—"} />
                <Kpi label="P/E fwd" value={f.fwd_pe != null ? f.fwd_pe.toFixed(1) : "—"} />
                <Kpi label="ROE" value={pctTxt(f.roe)} accent={pctCol(f.roe)} />
                <Kpi label="Crec. ventas" value={pctTxt(f.rev_growth)} accent={pctCol(f.rev_growth)} />
              </div>
            </>
          ) : (
            <FinancialsTable f={f} />
          )}
        </div>

        {/* RAIL */}
        <aside className="w-full shrink-0 lg:w-[330px]">
          <div className="sticky top-6 flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/30">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Pares del sector</div>
                <div className="text-[11px] text-zinc-600">{s.sector} · tocá para analizar</div>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">✕</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {rail.length === 0 && <div className="px-4 py-6 text-center text-xs text-zinc-600">Sin otros papeles del sector.</div>}
              {rail.map((x) => (
                <button key={x.ticker} onClick={() => onSelect(x.ticker)} className="flex w-full items-center gap-3 border-b border-zinc-800/60 px-4 py-2.5 text-left hover:bg-zinc-800/40">
                  <Logo s={x} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{x.ticker}</div>
                    <div className="truncate text-[11px] text-zinc-600">{x.name}</div>
                  </div>
                  <div className="text-right">
                    <div className={`nums text-xs ${(x.chg_pct ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>{fmtPct(x.chg_pct)}</div>
                    <div className="nums text-xs text-zinc-400">{fmtPrice(x.price)}</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={onClose} className="m-3 rounded-lg bg-violet-600/90 py-2.5 text-center text-sm font-medium text-white hover:bg-violet-600">
              Volver al panel
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FinancialsTable({ f }: { f: Fundamental }) {
  const years = Array.from(new Set([...Object.keys(f.revenue), ...Object.keys(f.fcf), ...Object.keys(f.shares)]))
    .map(Number).sort((a, b) => a - b);
  const cell = (rec: Record<string, number>, y: number, suf = "") =>
    rec[String(y)] != null ? rec[String(y)].toLocaleString("es-AR", { maximumFractionDigits: 1 }) + suf : "—";
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900/60 text-left text-[11px] uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-2">Métrica</th>
            {years.map((y) => <th key={y} className="px-3 py-2 text-right">{y}</th>)}
          </tr>
        </thead>
        <tbody className="nums">
          <tr className="border-t border-zinc-800/60"><td className="px-3 py-2 text-zinc-400">Ingresos (B)</td>{years.map((y) => <td key={y} className="px-3 py-2 text-right">{cell(f.revenue, y)}</td>)}</tr>
          <tr className="border-t border-zinc-800/60"><td className="px-3 py-2 text-zinc-400">Free cash flow (B)</td>{years.map((y) => <td key={y} className="px-3 py-2 text-right">{cell(f.fcf, y)}</td>)}</tr>
          <tr className="border-t border-zinc-800/60"><td className="px-3 py-2 text-zinc-400">Acciones (M)</td>{years.map((y) => <td key={y} className="px-3 py-2 text-right">{cell(f.shares, y)}</td>)}</tr>
        </tbody>
      </table>
    </div>
  );
}
