"use client";

import type { Signal } from "@/lib/types";
import { fmtPrice, fmtPct, horizonLabel, HELP } from "@/lib/format";
import { BiasBadge, ScorePips, RsiCell, Flag } from "./bits";
import { Logo } from "./Logo";
import { LineSpark } from "./Sparkline";
import { Icon } from "./Icons";
import { Tip } from "./Tooltip";

function HPill({ label, h }: { label: string; h?: string }) {
  const { txt, col } = horizonLabel(h);
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-zinc-600">{label}</span>
      <span className={col}>{txt}</span>
    </div>
  );
}

function MacdMini({ s }: { s: Signal }) {
  const st = s.macd?.state;
  if (!st) return <span className="text-zinc-600">—</span>;
  const col = st === "alcista" ? "text-green-400" : st === "bajista" ? "text-red-400" : "text-zinc-400";
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${col}`}>
      <Icon name={st === "alcista" ? "trendUp" : st === "bajista" ? "trendDown" : "minus"} size={12} />
      {st === "alcista" ? "Alcista" : st === "bajista" ? "Bajista" : "Plano"}
    </span>
  );
}

export function SimpleTable({
  groups,
  favs,
  onToggleFav,
  onSelect,
}: {
  groups: readonly (readonly [string, Signal[]])[];
  favs: Set<string>;
  onToggleFav: (t: string) => void;
  onSelect: (s: Signal) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full min-w-[840px] text-sm">
        <thead className="sticky top-0 z-20">
          <tr className="bg-[#141417] text-left text-[11px] uppercase tracking-wide text-zinc-500 shadow-[0_1px_0_#27272a]">
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Papel</th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium"><Tip text={HELP.precio} className="cursor-help border-b border-dotted border-zinc-700">Var % / Precio</Tip></th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium"><Tip text={HELP.trend7d} className="cursor-help border-b border-dotted border-zinc-700">7 días</Tip></th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium"><Tip text={HELP.senal} className="cursor-help border-b border-dotted border-zinc-700">Lectura</Tip></th>
            <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium"><Tip text={HELP.rsi} className="cursor-help border-b border-dotted border-zinc-700">RSI</Tip></th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium"><Tip text={HELP.macd} className="cursor-help border-b border-dotted border-zinc-700">MACD</Tip></th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium"><Tip text={HELP.corto + " / " + HELP.largo} className="cursor-help border-b border-dotted border-zinc-700">Tendencia</Tip></th>
            <th className="whitespace-nowrap px-3 py-2.5 text-center font-medium"><Tip text={HELP.score} className="cursor-help border-b border-dotted border-zinc-700">Técnico</Tip></th>
            <th className="px-2 py-2.5 text-center"><Tip text="Mi lista — tocá la estrella para guardar el papel (queda en tu navegador)"><Icon name="star" size={12} className="text-zinc-500" /></Tip></th>
          </tr>
        </thead>
        {groups.map(([gname, rows]) => (
          <tbody key={gname}>
            <tr>
              <td colSpan={9} className="border-l-2 border-violet-500/60 bg-[#0d0d10] px-3 py-1.5 text-xs font-medium text-zinc-300">
                {gname} <span className="text-zinc-600">· {rows.length}</span>
              </td>
            </tr>
            {rows.map((s) => {
              const up = (s.chg_pct ?? 0) >= 0;
              return (
                <tr key={s.ticker} onClick={() => onSelect(s)} className="cursor-pointer border-t border-zinc-800/60 transition-colors hover:bg-zinc-900/50">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Logo s={s} size={26} />
                      <div className="leading-tight">
                        <div className="flex items-center gap-1.5 font-medium"><Flag s={s} size={14} />{s.ticker}</div>
                        <div className="max-w-[170px] truncate text-[11px] text-zinc-600">{s.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className={`nums text-base font-bold leading-none ${up ? "text-green-400" : "text-red-400"}`}>{fmtPct(s.chg_pct)}</div>
                    <div className="nums mt-0.5 text-[11px] text-zinc-500">{fmtPrice(s.price, s.currency)}</div>
                  </td>
                  <td className="px-3 py-2.5"><div className="h-7 w-20">{s.spark?.price ? <LineSpark vals={s.spark.price.slice(-8)} color={up ? "#22c55e" : "#ef4444"} w={80} h={26} /> : null}</div></td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      <BiasBadge s={s} />
                      {s.status === "ok" && <span className="text-[11px] text-zinc-500">{s.bias?.text}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right"><RsiCell rsi={s.rsi} /></td>
                  <td className="px-3 py-2.5"><MacdMini s={s} /></td>
                  <td className="px-3 py-2.5">
                    <HPill label="Corto" h={s.horizon?.corto} />
                    <HPill label="Largo" h={s.horizon?.largo} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Tip text={s.score == null ? "Sin datos" : `Cumple ${s.score} de 5 criterios técnicos`}><ScorePips score={s.score} /></Tip>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <button onClick={(e) => { e.stopPropagation(); onToggleFav(s.ticker); }} className={`cursor-pointer ${favs.has(s.ticker) ? "text-amber-400" : "text-zinc-700 hover:text-zinc-400"}`} title="Mi lista">
                      <Icon name="star" size={16} fill={favs.has(s.ticker)} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
