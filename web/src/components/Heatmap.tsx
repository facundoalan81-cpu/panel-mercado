"use client";

import { useMemo } from "react";
import type { Signal } from "@/lib/types";
import { SECTOR_ORDER, fmtPct } from "@/lib/format";

function tileColor(chg: number | null | undefined): string {
  if (chg == null) return "rgba(82,82,91,0.25)";
  const m = Math.min(Math.abs(chg) / 5, 1);
  const a = 0.14 + m * 0.66;
  return chg >= 0 ? `rgba(34,197,94,${a.toFixed(2)})` : `rgba(239,68,68,${a.toFixed(2)})`;
}

export function Heatmap({ items, onSelect }: { items: Signal[]; onSelect: (s: Signal) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, Signal[]>();
    for (const s of items) {
      if (s.status !== "ok") continue;
      const k = s.sector || "Otros";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    for (const rows of map.values()) rows.sort((a, b) => (b.chg_pct ?? 0) - (a.chg_pct ?? 0));
    return [...map.entries()].sort((a, b) => SECTOR_ORDER.indexOf(a[0]) - SECTOR_ORDER.indexOf(b[0]));
  }, [items]);

  return (
    <div className="space-y-4">
      {groups.map(([sector, rows]) => (
        <div key={sector}>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{sector} <span className="text-zinc-600">· {rows.length}</span></div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-12">
            {rows.map((s) => (
              <button
                key={s.ticker}
                onClick={() => onSelect(s)}
                className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-md border border-white/5 p-1 transition-transform duration-150 hover:scale-[1.04] hover:border-white/20"
                style={{ background: tileColor(s.chg_pct) }}
                title={`${s.name} · ${fmtPct(s.chg_pct)}`}
              >
                <span className="text-[12px] font-semibold leading-none text-white">{s.ticker}</span>
                <span className="nums mt-0.5 text-[10px] leading-none text-white/90">{fmtPct(s.chg_pct)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
