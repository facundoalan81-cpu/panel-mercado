"use client";

import { useMemo, useState } from "react";
import type { Signal, Fng } from "@/lib/types";
import { SECTOR_ORDER, fmtPct, fmtPrice } from "@/lib/format";
import { Tip } from "./Tooltip";
import { Icon } from "./Icons";
import { Logo } from "./Logo";

// ---- Índice Miedo/Codicia (estilo CNN Fear & Greed) ----
function fngZone(v: number): { label: string; color: string; text: string } {
  if (v < 25) return { label: "Miedo extremo", color: "#ef4444", text: "text-red-400" };
  if (v < 45) return { label: "Miedo", color: "#f97316", text: "text-orange-400" };
  if (v <= 55) return { label: "Neutral", color: "#eab308", text: "text-yellow-400" };
  if (v < 75) return { label: "Codicia", color: "#84cc16", text: "text-lime-400" };
  return { label: "Codicia extrema", color: "#22c55e", text: "text-green-400" };
}

function FngGauge({ value }: { value: number }) {
  const cx = 120, cy = 118, r = 92, sw = 16;
  const pt = (v: number, rad = r): [number, number] => { const a = Math.PI * (1 - v / 100); return [cx + rad * Math.cos(a), cy - rad * Math.sin(a)]; };
  const arc = (a: number, b: number, color: string) => {
    const [x0, y0] = pt(a); const [x1, y1] = pt(b);
    return <path key={a} d={`M${x0} ${y0} A${r} ${r} 0 ${b - a > 50 ? 1 : 0} 1 ${x1} ${y1}`} stroke={color} strokeWidth={sw} fill="none" />;
  };
  const [nx, ny] = pt(Math.min(99.5, Math.max(0.5, value)), r - 6);
  return (
    <svg viewBox="0 0 240 150" className="w-full max-w-[250px]">
      {arc(0.5, 25, "#ef4444")}
      {arc(25, 45, "#f97316")}
      {arc(45, 55, "#eab308")}
      {arc(55, 75, "#84cc16")}
      {arc(75, 99.5, "#22c55e")}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fafafa" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill="#fafafa" />
      <text x="20" y="140" fill="#71717a" fontSize="8.5" fontWeight="700">MIEDO</text>
      <text x="188" y="140" fill="#71717a" fontSize="8.5" fontWeight="700">CODICIA</text>
    </svg>
  );
}

function PrevRow({ label, v }: { label: string; v: number | null }) {
  if (v == null) return null;
  const z = fngZone(v);
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
        <div className={`text-xs font-medium ${z.text}`}>{z.label}</div>
      </div>
      <span className="nums grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold" style={{ background: z.color + "26", color: z.color }}>{v}</span>
    </div>
  );
}

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function FngTimeline({ history }: { history: { d: string; v: number }[] }) {
  if (!history?.length) return <div className="py-8 text-center text-xs text-zinc-600">Sin histórico todavía.</div>;
  const W = 320, H = 178, top = 6, botAx = 18, padL = 4, padR = 26;
  const n = history.length;
  const x = (i: number) => padL + (n <= 1 ? 0 : i / (n - 1)) * (W - padL - padR);
  const y = (v: number) => top + (1 - v / 100) * (H - botAx - top);
  const line = history.map((h, i) => `${x(i).toFixed(1)},${y(h.v).toFixed(1)}`).join(" ");
  const area = `${x(0).toFixed(1)},${y(0).toFixed(1)} ${line} ${x(n - 1).toFixed(1)},${y(0).toFixed(1)}`;
  const ticks = [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (n - 1))))];
  const last = history[n - 1];
  const z = fngZone(last.v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="fngfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* bandas referencia */}
      {[25, 50, 75].map((g) => (
        <g key={g}>
          <line x1={padL} y1={y(g)} x2={W - padR} y2={y(g)} stroke="#27272a" strokeWidth={1} strokeDasharray={g === 50 ? "0" : "3 3"} />
          <text x={W - padR + 3} y={y(g) + 3} fill="#52525b" fontSize="8">{g}</text>
        </g>
      ))}
      <polygon points={area} fill="url(#fngfill)" />
      <polyline points={line} fill="none" stroke="#7c5cff" strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={x(n - 1)} cy={y(last.v)} r={3.2} fill={z.color} stroke="#0a0a0c" strokeWidth={1.5} />
      {/* eje meses */}
      {ticks.map((i) => {
        const mm = +history[i].d.slice(5, 7) - 1;
        return <text key={i} x={x(i)} y={H - 4} fill="#71717a" fontSize="8.5" textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>{MES[mm]}</text>;
      })}
    </svg>
  );
}

function FearGreed({ fng }: { fng: Fng }) {
  const [mode, setMode] = useState<"resumen" | "historico">("resumen");
  const z = fngZone(fng.value);
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Miedo y Codicia</h3>
          <Tip text="Termómetro del mercado tipo Fear & Greed: 0 = miedo extremo (mercado vendido), 100 = codicia extrema (mercado comprado). Sale del promedio de cuántas acciones están técnicamente alcistas. Histórico del último año.">
            <Icon name="help" size={12} className="text-zinc-600" />
          </Tip>
        </div>
        <div className="flex rounded-lg border border-zinc-800 p-0.5">
          {(["resumen", "historico"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`cursor-pointer rounded-md px-2 py-0.5 text-[10px] transition-colors ${mode === m ? "bg-zinc-200 font-medium text-zinc-900" : "text-zinc-500 hover:text-zinc-300"}`}>{m === "resumen" ? "Resumen" : "Histórico"}</button>
          ))}
        </div>
      </div>
      {mode === "resumen" ? (
        <>
          <div className="flex flex-col items-center">
            <FngGauge value={fng.value} />
            <div className={`nums -mt-3 text-4xl font-bold ${z.text}`}>{fng.value}</div>
            <div className={`text-sm font-semibold ${z.text}`}>{z.label}</div>
          </div>
          <div className="mt-2 border-t border-zinc-800/60">
            <PrevRow label="Cierre previo" v={fng.prev.close} />
            <PrevRow label="Hace 1 semana" v={fng.prev.week} />
            <PrevRow label="Hace 1 mes" v={fng.prev.month} />
            <PrevRow label="Hace 1 año" v={fng.prev.year} />
          </div>
        </>
      ) : (
        <FngTimeline history={fng.history} />
      )}
    </section>
  );
}

function MoverRow({ s, onSelect }: { s: Signal; onSelect: (s: Signal) => void }) {
  const up = (s.chg_pct ?? 0) >= 0;
  return (
    <button onClick={() => onSelect(s)} className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-zinc-800/60">
      <Logo s={s} size={20} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-xs font-medium text-zinc-200">{s.ticker}</div>
        <div className="truncate text-[10px] text-zinc-600">{fmtPrice(s.price, s.currency)}</div>
      </div>
      <span className={`nums text-xs font-semibold ${up ? "text-green-400" : "text-red-400"}`}>{fmtPct(s.chg_pct)}</span>
    </button>
  );
}

export function MarketPanel({ items, fng, onSelect }: { items: Signal[]; fng?: Fng; onSelect?: (s: Signal) => void }) {
  const { comprando, vendiendo, total, sectors, subiendo, bajando } = useMemo(() => {
    const scored = items.filter((s) => s.status === "ok" && s.bias).map((s) => ({ s, v: s.bias!.score }));
    const total = scored.length;
    const comprando = scored.filter((x) => x.v >= 50).length;
    const vendiendo = total - comprando;
    const bySec: Record<string, { sum: number; n: number }> = {};
    for (const { s, v } of scored) {
      if (!s.sector) continue;
      bySec[s.sector] = bySec[s.sector] || { sum: 0, n: 0 };
      bySec[s.sector].sum += v; bySec[s.sector].n += 1;
    }
    const sectors = SECTOR_ORDER.filter((k) => bySec[k]).map((k) => ({ name: k, pct: Math.round(bySec[k].sum / bySec[k].n), n: bySec[k].n }));
    const withChg = items.filter((s) => s.status === "ok" && s.chg_pct != null).sort((a, b) => (b.chg_pct ?? 0) - (a.chg_pct ?? 0));
    return { comprando, vendiendo, total, sectors, subiendo: withChg.slice(0, 4), bajando: withChg.slice(-4).reverse() };
  }, [items]);

  return (
    <div className="space-y-5">
      {fng?.history?.length ? <FearGreed fng={fng} /> : null}

      <section>
        <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Del filtro actual</h3>
        <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-1 text-green-400"><Icon name="arrowUp" size={12} />{comprando} comprando</span>
          <span className="inline-flex items-center gap-1 text-red-400"><Icon name="arrowDown" size={12} />{vendiendo} vendiendo</span>
          <span className="ml-auto text-zinc-600">de {total}</span>
        </div>
      </section>

      {onSelect && (subiendo.length > 0 || bajando.length > 0) && (
        <section>
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Movimiento del día</h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <div className="mb-1 flex items-center gap-1 px-1.5 text-[10px] uppercase tracking-wide text-green-500/80"><Icon name="trendUp" size={11} /> Más suben</div>
              {subiendo.map((s) => <MoverRow key={s.ticker} s={s} onSelect={onSelect} />)}
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1 px-1.5 text-[10px] uppercase tracking-wide text-red-500/80"><Icon name="trendDown" size={11} /> Más bajan</div>
              {bajando.map((s) => <MoverRow key={s.ticker} s={s} onSelect={onSelect} />)}
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center gap-1.5">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Sectores</h3>
          <Tip text="Sesgo técnico promedio por sector del filtro actual. Verde = comprador, rojo = vendedor."><Icon name="help" size={12} className="text-zinc-600" /></Tip>
          <span className="ml-auto text-[11px] text-zinc-600">{sectors.length}</span>
        </div>
        <div className="space-y-2.5">
          {sectors.map((s) => (
            <div key={s.name}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-zinc-300">{s.name} <span className="text-zinc-600">· {s.n}</span></span>
                <span className={`nums ${s.pct >= 60 ? "text-green-400" : s.pct <= 40 ? "text-red-400" : "text-amber-400"}`}>{s.pct}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className={`h-full rounded-full ${s.pct >= 60 ? "bg-green-500" : s.pct <= 40 ? "bg-red-500" : "bg-amber-500"}`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
