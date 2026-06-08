import type { Signal } from "@/lib/types";
import { CLASS_META, rsiColor, verdict } from "@/lib/format";
import { Icon } from "./Icons";
import { HistSpark } from "./Sparkline";

export { Flag } from "./Icons";

function num(v: number | null | undefined, d?: number): string {
  if (v == null) return "—";
  const dec = d ?? (Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 1 ? 2 : 3);
  return v.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtVol(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
  return String(Math.round(v));
}

const CLASS_ICON: Record<string, string> = { FUERTE: "trendUp", POTENCIAL: "trendUp", A_REVISAR: "alert", CALIENTE: "alert" };

export function ClassBadge({ s, full = false }: { s: Signal; full?: boolean }) {
  const m = CLASS_META[s.classification];
  if (s.classification === "SIN_SENAL" || s.classification === "SIN_DATOS") {
    return <span className="text-xs text-zinc-600">{m.label}</span>;
  }
  const sub = s.classification === "FUERTE" && s.substate === "rompiendo_ultima_media" ? " · rompiendo" : "";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium ${m.badge}`} title={m.label + sub}>
      {CLASS_ICON[s.classification] && <Icon name={CLASS_ICON[s.classification]} size={12} />}
      <span>{full ? m.label : m.label.split(" ").slice(-1)[0]}</span>
      {sub && <span className="opacity-70">{sub}</span>}
    </span>
  );
}

// Veredicto Compra/Venta derivado de la confluencia de los 10 indicadores.
export function BiasBadge({ s }: { s: Signal }) {
  if (!s.bias) return <span className="text-xs text-zinc-600">—</span>;
  const v = verdict(s.bias.score);
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${v.cls}`} title={s.bias.text || undefined}>
      <Icon name={v.icon} size={12} />
      {v.label}
    </span>
  );
}

export function ScorePips({ score }: { score?: number | null }) {
  const n = score ?? 0;
  const color = n >= 4 ? "bg-green-500" : n === 3 ? "bg-amber-500" : n >= 1 ? "bg-zinc-500" : "bg-zinc-700";
  return (
    <span className="inline-flex items-center gap-0.5" title={score == null ? "sin datos" : `${n}/5`}>
      {[0, 1, 2, 3, 4].map((i) => <span key={i} className={`h-2 w-2 rounded-[2px] ${i < n ? color : "bg-zinc-800"}`} />)}
    </span>
  );
}

export function RsiCell({ rsi }: { rsi?: number }) {
  if (rsi == null) return <span className="text-zinc-600">—</span>;
  const label = rsi >= 70 ? "Sobrecompra" : rsi <= 30 ? "Sobreventa" : "Neutral";
  return (
    <div className="leading-tight">
      <div className={`nums ${rsiColor(rsi)}`}>{rsi.toFixed(0)}</div>
      <div className="text-[10px] text-zinc-600">{label}</div>
    </div>
  );
}

export function MacdPill({ s }: { s: Signal }) {
  const st = s.macd?.state;
  if (!st) return <span className="text-zinc-600">—</span>;
  const color = st === "alcista" ? "text-green-400" : st === "bajista" ? "text-red-400" : "text-zinc-400";
  const hist = s.spark?.macd_hist?.filter((v) => v != null) as number[] | undefined;
  return (
    <div className="flex items-center gap-2">
      {hist && hist.length > 2 && <span className="block h-5 w-10 shrink-0"><HistSpark vals={s.spark!.macd_hist.slice(-12)} w={40} h={20} /></span>}
      <div className={`leading-tight ${color}`}>
        <span className="inline-flex items-center gap-0.5 text-xs">
          <Icon name={st === "alcista" ? "trendUp" : st === "bajista" ? "trendDown" : "minus"} size={11} />
          {st === "alcista" ? "Alcista" : st === "bajista" ? "Bajista" : "Plano"}
        </span>
        <div className="nums text-[10px] text-zinc-500">{num(s.macd?.hist, 2)}</div>
      </div>
    </div>
  );
}

export function MAsGlyph({ s }: { s: Signal }) {
  const above = s.mas?.above;
  if (!above) return <span className="text-zinc-600">—</span>;
  const order = [{ k: "ema20" as const, l: "EMA20" }, { k: "sma30" as const, l: "SMA30" }, { k: "ema150" as const, l: "EMA150" }, { k: "ema200" as const, l: "EMA200" }];
  return (
    <span className="inline-flex items-end gap-[3px] h-4" title={order.map((o) => `${o.l}: ${above[o.k] ? "arriba" : "abajo"}`).join(" · ")}>
      {order.map((o, i) => <span key={o.k} className={`w-[3px] rounded-sm ${above[o.k] ? "bg-green-500" : "bg-red-500/80"}`} style={{ height: `${7 + i * 3}px` }} />)}
    </span>
  );
}

export function VolFlowCell({ s }: { s: Signal }) {
  const f = s.money_flow;
  if (!f || f === "N/A") return <span className="text-zinc-600 text-xs">—</span>;
  const map = { entrada: ["arrowUp", "text-green-400", "entra"], salida: ["arrowDown", "text-red-400", "sale"], neutro: ["minus", "text-zinc-400", "neutro"] } as const;
  const [ic, col, lbl] = map[f as keyof typeof map];
  return <span className={`inline-flex items-center gap-1 text-xs ${col}`} title={`CMF ${s.cmf}`}><Icon name={ic} size={12} /> {lbl}</span>;
}

// ---- celdas técnicas estilo terminal ----
export function EmaPair({ la, lb, va, vb, aa, ab }: { la: string; lb: string; va: number | null; vb: number | null; aa: boolean | null; ab: boolean | null }) {
  const c = (above: boolean | null) => (above == null ? "text-zinc-500" : above ? "text-green-400" : "text-red-400");
  return (
    <div className="nums text-[11px] leading-tight">
      <div><span className="text-zinc-600">{la}</span> <span className={c(aa)}>{num(va)}</span></div>
      <div><span className="text-zinc-600">{lb}</span> <span className={c(ab)}>{num(vb)}</span></div>
    </div>
  );
}

export function SuperTrendCell({ s }: { s: Signal }) {
  const st = s.supertrend;
  if (!st?.dir) return <span className="text-zinc-600">—</span>;
  const up = st.dir === "up";
  return (
    <div className={`leading-tight ${up ? "text-green-400" : "text-red-400"}`}>
      <span className="inline-flex items-center gap-1 text-xs"><Icon name={up ? "arrowUp" : "arrowDown"} size={12} />{up ? "Up" : "Down"}</span>
      <div className="nums text-[10px] text-zinc-500">{num(st.value)}</div>
    </div>
  );
}

export function WaveTrendCell({ s }: { s: Signal }) {
  const wt = s.wavetrend;
  if (wt?.wt1 == null) return <span className="text-zinc-600">—</span>;
  const up = wt.dir === "up";
  return (
    <span className={`nums inline-flex items-center gap-1 text-xs ${up ? "text-green-400" : "text-red-400"}`}>
      <Icon name={up ? "arrowUp" : "arrowDown"} size={11} />{wt.wt1.toFixed(1)}
    </span>
  );
}

export function BbpCell({ s }: { s: Signal }) {
  const b = s.bbp;
  if (b?.state == null) return <span className="text-zinc-600">—</span>;
  const bull = b.state === "bull";
  return (
    <div className={`leading-tight ${bull ? "text-green-400" : "text-red-400"}`}>
      <div className="text-xs">{bull ? "Bull" : "Bear"}</div>
      <div className="nums text-[10px] text-zinc-500">{num(b.value, 2)}</div>
    </div>
  );
}

export function AvwapCell({ s }: { s: Signal }) {
  const a = s.avwap;
  if (!a || a.pct == null) return <span className="text-zinc-600">—</span>;
  const up = a.pct >= 0;
  return (
    <div className="nums leading-tight">
      <div className={`text-xs ${up ? "text-green-400" : "text-red-400"}`}>{up ? "+" : ""}{a.pct.toFixed(1)}%</div>
      <div className="text-[10px] text-zinc-600">{num(a.value)}</div>
    </div>
  );
}

export function RsiHistCell({ v }: { v?: number | null }) {
  if (v == null) return <span className="text-zinc-600">—</span>;
  return <span className={`nums text-xs ${v >= 0 ? "text-green-400" : "text-red-400"}`}>{v >= 0 ? "+" : ""}{v.toFixed(1)}</span>;
}

export function VolCell({ s }: { s: Signal }) {
  const v = s.vol;
  if (!v || v.value == null) return <span className="text-zinc-600">—</span>;
  const hot = (v.rel ?? 0) >= 1.5;
  return (
    <div className="nums leading-tight">
      <div className={`text-xs ${hot ? "text-amber-400" : "text-zinc-300"}`}>{fmtVol(v.value)}</div>
      {v.rel != null && <div className="text-[10px] text-zinc-600">{v.rel.toFixed(1)}×</div>}
    </div>
  );
}
