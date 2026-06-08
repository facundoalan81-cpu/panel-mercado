"use client";

import { useMemo } from "react";
import type { Signal } from "@/lib/types";
import { SECTOR_ORDER, fmtPct, fmtPrice } from "@/lib/format";
import { Tip } from "./Tooltip";
import { Icon } from "./Icons";
import { Logo } from "./Logo";

function Gauge({ value }: { value: number }) {
  // value 0..100, semicírculo 180°(izq) -> 0°(der)
  const a = Math.PI * (1 - value / 100);
  const cx = 100, cy = 96, r = 78;
  const nx = cx + r * Math.cos(a), ny = cy - r * Math.sin(a);
  const seg = (from: number, to: number, color: string) => {
    const a0 = Math.PI * (1 - from / 100), a1 = Math.PI * (1 - to / 100);
    const x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
    return <path d={`M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`} stroke={color} strokeWidth={12} fill="none" strokeLinecap="round" />;
  };
  return (
    <svg viewBox="0 0 200 108" className="w-full max-w-[220px]">
      {seg(0, 32, "#ef4444")}
      {seg(34, 66, "#f59e0b")}
      {seg(68, 100, "#22c55e")}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fafafa" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="#fafafa" />
      <text x="14" y="106" fill="#52525b" fontSize="9">Vendedor</text>
      <text x="158" y="106" fill="#52525b" fontSize="9">Comprador</text>
    </svg>
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

export function MarketPanel({ items, onSelect }: { items: Signal[]; onSelect?: (s: Signal) => void }) {
  const { sentiment, label, col, comprando, vendiendo, total, sectors, subiendo, bajando } = useMemo(() => {
    const scored = items.filter((s) => s.status === "ok" && s.bias).map((s) => ({ s, v: s.bias!.score }));
    const total = scored.length;
    const sentiment = total ? Math.round(scored.reduce((a, x) => a + x.v, 0) / total) : 50;
    const comprando = scored.filter((x) => x.v >= 50).length;
    const vendiendo = total - comprando;
    const label = sentiment >= 60 ? "Comprador" : sentiment <= 40 ? "Vendedor" : "Mixto";
    const col = sentiment >= 60 ? "text-green-400" : sentiment <= 40 ? "text-red-400" : "text-amber-400";

    const bySec: Record<string, { sum: number; n: number }> = {};
    for (const { s, v } of scored) {
      if (!s.sector) continue;
      bySec[s.sector] = bySec[s.sector] || { sum: 0, n: 0 };
      bySec[s.sector].sum += v; bySec[s.sector].n += 1;
    }
    const sectors = SECTOR_ORDER.filter((k) => bySec[k]).map((k) => ({ name: k, pct: Math.round(bySec[k].sum / bySec[k].n), n: bySec[k].n }));

    const withChg = items.filter((s) => s.status === "ok" && s.chg_pct != null).sort((a, b) => (b.chg_pct ?? 0) - (a.chg_pct ?? 0));
    const subiendo = withChg.slice(0, 4);
    const bajando = withChg.slice(-4).reverse();
    return { sentiment, label, col, comprando, vendiendo, total, sectors, subiendo, bajando };
  }, [items]);

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-center gap-1.5">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Sentimiento del mercado</h3>
          <Tip text="Promedio del sesgo técnico (Compra/Venta) de los papeles que estás viendo ahora. Cambia según los filtros, el tab y el marco temporal que elijas. 100 = todos comprando, 0 = todos vendiendo."><Icon name="help" size={12} className="text-zinc-600" /></Tip>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/30 pt-3 pb-2.5">
          <Gauge value={sentiment} />
          <div className={`nums -mt-1 text-3xl font-bold ${col}`}>{sentiment}</div>
          <div className={`text-sm font-semibold ${col}`}>{label}</div>
          <div className="mt-2 flex w-full items-center justify-center gap-4 border-t border-zinc-800 pt-2 text-xs">
            <span className="inline-flex items-center gap-1 text-green-400"><Icon name="arrowUp" size={12} />{comprando} comprando</span>
            <span className="inline-flex items-center gap-1 text-red-400"><Icon name="arrowDown" size={12} />{vendiendo} vendiendo</span>
          </div>
        </div>
        <p className="mt-1.5 px-0.5 text-[10px] leading-snug text-zinc-600">Sobre {total} papeles del filtro actual. Promedio de medias, MACD, RSI, flujo y SuperTrend.</p>
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
          <Tip text="Sesgo técnico promedio por sector (mismo cálculo que el sentimiento, agrupado). Verde = comprador, rojo = vendedor."><Icon name="help" size={12} className="text-zinc-600" /></Tip>
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
