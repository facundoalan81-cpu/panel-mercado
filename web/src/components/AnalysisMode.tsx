"use client";

import { useMemo, useState } from "react";
import type { Signal, Fundamental, Fundamentals } from "@/lib/types";
import { fmtPrice, fmtPct, sectorMedians, vsSector, earningsInfo, fmtEsNum } from "@/lib/format";
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

// Card de valuación con semáforo relativo al sector.
function ValCard({ label, value, verdict, median }: { label: string; value: React.ReactNode; verdict: { label: string; col: string } | null; median?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="nums mt-1.5 text-2xl font-semibold text-zinc-100">{value}</div>
      {verdict ? <div className={`mt-0.5 text-[11px] font-medium ${verdict.col}`}>{verdict.label}</div> : <div className="mt-0.5 text-[11px] text-zinc-600">sin dato del sector</div>}
      {median && <div className="text-[10px] text-zinc-600">mediana sector {median}</div>}
    </div>
  );
}

function recoLabel(r: string): string {
  const m: Record<string, string> = { strong_buy: "compra fuerte", buy: "compra", hold: "mantener", underperform: "por debajo", sell: "venta", none: "sin consenso" };
  return m[r] ?? r;
}

export function AnalysisMode({
  s,
  f,
  resumen,
  all,
  funds,
  onSelect,
  onClose,
}: {
  s: Signal;
  f: Fundamental | null;
  resumen?: string;
  all: Signal[];
  funds: Fundamentals;
  onSelect: (ticker: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"resumen" | "financials">("resumen");
  const [expand, setExpand] = useState(false);
  const up = (s.chg_pct ?? 0) >= 0;
  const meta = useMemo(() => sectorMedians(funds), [funds]);
  const med = f?.sector ? meta[f.sector] : undefined;
  const metaDate = useMemo(() => {
    const iso = (funds as unknown as Record<string, { generated_at?: string }>)["_meta"]?.generated_at;
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
  }, [funds]);

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
            {(resumen || f?.summary) && (
              <div className="mt-4 border-t border-zinc-800 pt-4">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">Qué hace</div>
                {resumen ? (
                  <p className="text-sm leading-relaxed text-zinc-300">{resumen}</p>
                ) : (
                  <>
                    <p className={`text-sm leading-relaxed text-zinc-400 ${expand ? "" : "line-clamp-3"}`}>{f!.summary}</p>
                    <button onClick={() => setExpand((v) => !v)} className="mt-1 text-xs text-zinc-500 hover:text-zinc-300">{expand ? "Ver menos" : "Ver más"}</button>
                  </>
                )}
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
              {f.currency === "ARS" && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  ⚠ Balances en pesos nominales (inflación): los ratios de valuación (P/E, ROE, EV/EBITDA) no son comparables y se ocultan. Las series anuales también están distorsionadas — para valuar este papel, usar su ADR en USD si existe.
                </div>
              )}
              {/* Fila de contexto: balance, dividendo, beta */}
              {(() => {
                const e = earningsInfo(f.earnings_ts);
                return (
                  <div className="grid grid-cols-3 gap-3">
                    <Kpi label="Próximo balance" value={e ? e.date : "—"} sub={e ? (e.days <= 0 ? "estos días" : `en ${e.days} días`) : "sin fecha"} accent={e?.soon ? "text-violet-300" : undefined} />
                    <Kpi label="Dividendo" value={f.dividend_yield != null ? (f.dividend_yield > 0 ? `${f.dividend_yield.toFixed(2)}%` : "No paga") : "—"} sub={f.dividend_yield && f.payout != null ? `reparte ${(f.payout * 100).toFixed(0)}%` : "anual"} />
                    <Kpi label="Beta" value={f.beta != null ? f.beta.toFixed(2) : "—"} sub={f.beta != null ? (f.beta > 1.2 ? "más volátil que el mercado" : f.beta < 0.8 ? "más estable" : "acompaña al mercado") : undefined} />
                  </div>
                );
              })()}
              {/* Rango 52 semanas */}
              {f.hi52 != null && f.lo52 != null && f.hi52 > f.lo52 && s.price != null && (() => {
                const pos = Math.max(0, Math.min(100, ((s.price - f.lo52) / (f.hi52 - f.lo52)) * 100));
                return (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
                    <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-500"><span>Rango 52 semanas</span><span className="nums text-zinc-400">{pos.toFixed(0)}% del rango</span></div>
                    <div className="relative mt-3 h-1.5 rounded-full bg-zinc-800">
                      <div className="absolute top-1/2 h-3.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400" style={{ left: `${pos}%` }} />
                    </div>
                    <div className="nums mt-2 flex justify-between text-[11px] text-zinc-500"><span>{fmtPrice(f.lo52)}</span><span className="text-zinc-300">actual {fmtPrice(s.price)}</span><span>{fmtPrice(f.hi52)}</span></div>
                  </div>
                );
              })()}
              {/* Valuación con contexto vs sector (semáforos) */}
              {f.currency !== "ARS" && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <ValCard label="P/E" value={f.pe != null ? `${f.pe.toFixed(1)}x` : "—"} verdict={vsSector(f.pe, med?.pe, "lower")} median={med?.pe != null ? `${med.pe.toFixed(1)}x` : undefined} />
                  <ValCard label="ROE" value={pctTxt(f.roe)} verdict={vsSector(f.roe, med?.roe, "higher")} median={med?.roe != null ? pctTxt(med.roe) : undefined} />
                  <ValCard label="Margen neto" value={pctTxt(f.profit_margin)} verdict={vsSector(f.profit_margin, med?.profit_margin, "higher")} median={med?.profit_margin != null ? pctTxt(med.profit_margin) : undefined} />
                  <ValCard label="Crec. ventas" value={pctTxt(f.rev_growth)} verdict={vsSector(f.rev_growth, med?.rev_growth, "higher")} median={med?.rev_growth != null ? pctTxt(med.rev_growth) : undefined} />
                </div>
              )}
              {/* Target de analistas (solo si hay ≥5, para evitar targets basura) */}
              {f.currency !== "ARS" && f.target != null && s.price != null && (f.analysts ?? 0) >= 5 && (() => {
                const upside = (f.target / s.price - 1) * 100;
                return (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Target de analistas</div>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="nums text-2xl font-semibold">{fmtPrice(f.target)}</span>
                      <span className={`nums text-sm font-medium ${upside >= 0 ? "text-green-400" : "text-red-400"}`}>{upside >= 0 ? "+" : ""}{upside.toFixed(0)}% vs precio actual</span>
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-600">Promedio de {f.analysts} analistas{f.reco ? ` · ${recoLabel(f.reco)}` : ""}</div>
                  </div>
                );
              })()}
              {/* Charts: anual + trimestral + FCF + dilución */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ChartCard title="Ingresos" sub="Anual (miles de M)"><FundChart data={f.revenue} color="#60a5fa" /></ChartCard>
                {f.rev_q && Object.keys(f.rev_q).length >= 2 && (
                  <ChartCard title="Ingresos" sub="Trimestral — muestra la aceleración (miles de M)"><FundChart data={f.rev_q} color="#818cf8" /></ChartCard>
                )}
                <ChartCard title="Free cash flow" sub="Anual (miles de M)"><FundChart data={f.fcf} color="#34d399" /></ChartCard>
                <ChartCard title="Dilución" sub="Acciones en circulación (M)"><FundChart data={f.shares} color="#f59e0b" /></ChartCard>
              </div>
            </>
          ) : (
            <FinancialsTable f={f} />
          )}

          {metaDate && (
            <p className="pt-1 text-center text-[11px] text-zinc-600">Datos de empresa actualizados el {metaDate} · Yahoo Finance</p>
          )}
        </div>

        {/* RAIL */}
        <aside className="w-full shrink-0 lg:w-[330px]">
          <div className="sticky top-6 flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/30">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Similares</div>
                <div className="text-[11px] text-zinc-600">Mismo sector · {s.sector}</div>
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
  const cell = (rec: Record<string, number>, y: number) =>
    rec[String(y)] != null ? fmtEsNum(rec[String(y)]) : "—";
  // Margen FCF por año (no tenemos ingreso neto por año -> flujo libre / ventas, honesto).
  const marginCell = (y: number) => {
    const r = f.revenue[String(y)]; const c = f.fcf[String(y)];
    return r && c != null ? `${fmtEsNum((c / r) * 100, 0)}%` : "—";
  };
  const qKeys = f.rev_q
    ? Object.keys(f.rev_q).sort((a, b) => (Number(a.slice(0, 4)) * 4 + Number(a.slice(5))) - (Number(b.slice(0, 4)) * 4 + Number(b.slice(5))))
    : [];
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900/60 text-left text-[11px] uppercase tracking-wide text-zinc-500">
              <th className="px-3 py-2">Anual</th>
              {years.map((y) => <th key={y} className="px-3 py-2 text-right">{y}</th>)}
            </tr>
          </thead>
          <tbody className="nums">
            <tr className="border-t border-zinc-800/60"><td className="px-3 py-2 text-zinc-400">Ingresos (B)</td>{years.map((y) => <td key={y} className="px-3 py-2 text-right">{cell(f.revenue, y)}</td>)}</tr>
            <tr className="border-t border-zinc-800/60"><td className="px-3 py-2 text-zinc-400">Free cash flow (B)</td>{years.map((y) => <td key={y} className="px-3 py-2 text-right">{cell(f.fcf, y)}</td>)}</tr>
            <tr className="border-t border-zinc-800/60"><td className="px-3 py-2 text-zinc-400">Margen FCF</td>{years.map((y) => <td key={y} className="px-3 py-2 text-right">{marginCell(y)}</td>)}</tr>
            <tr className="border-t border-zinc-800/60"><td className="px-3 py-2 text-zinc-400">Acciones (M)</td>{years.map((y) => <td key={y} className="px-3 py-2 text-right">{cell(f.shares, y)}</td>)}</tr>
          </tbody>
        </table>
      </div>
      {qKeys.length >= 2 && (
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">Trimestral (ingresos)</div>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900/60 text-left text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2">Trimestre</th>
                  {qKeys.map((k) => <th key={k} className="px-3 py-2 text-right">{`${k.slice(5)}T${k.slice(2, 4)}`}</th>)}
                </tr>
              </thead>
              <tbody className="nums">
                <tr className="border-t border-zinc-800/60"><td className="px-3 py-2 text-zinc-400">Ingresos (B)</td>{qKeys.map((k) => <td key={k} className="px-3 py-2 text-right">{fmtEsNum(f.rev_q![k])}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
