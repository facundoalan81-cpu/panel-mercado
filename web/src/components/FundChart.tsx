"use client";

import { useId } from "react";

// Claves anuales ("2025") y trimestrales ("2025Q2") — mismo criterio que FundChart.
const ordKey = (k: string) => (k.includes("Q") ? Number(k.slice(0, 4)) * 4 + Number(k.slice(5)) : Number(k) * 4);
const labelKey = (k: string) => (k.includes("Q") ? `${k.slice(5)}T${k.slice(2, 4)}` : k);
const fmtNum = (v: number, dec?: number) =>
  v.toLocaleString("es-AR", { maximumFractionDigits: dec ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2) });

// Bar chart con gradiente vertical, barras redondeadas arriba, negativos en rojo bajo el cero.
// diverge: colorea cada barra verde/rojo según signo (para ganancia neta).
export function FundBars({
  data,
  color = "#818cf8",
  unit = "",
  diverge = false,
  labelAll,
  w = 300,
  h = 140,
}: {
  data: Record<string, number>;
  color?: string;
  unit?: string;
  diverge?: boolean;
  labelAll?: boolean;
  w?: number;
  h?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const keys = Object.keys(data).sort((a, b) => ordKey(a) - ordKey(b));
  const pts = keys.map((k) => ({ k, v: data[k] }));
  if (pts.length < 1) return <div className="grid h-[140px] place-items-center text-xs text-zinc-600">sin datos</div>;

  const vals = pts.map((p) => p.v);
  let min = Math.min(...vals, 0);
  let max = Math.max(...vals, 0);
  if (min === max) max += 1;
  const padTop = 16, padBot = 20, padX = 6;
  const chartH = h - padTop - padBot;
  const zeroY = padTop + (max / (max - min)) * chartH; // y del 0
  const y = (v: number) => padTop + ((max - v) / (max - min)) * chartH;

  const n = pts.length;
  const slot = (w - padX * 2) / n;
  const bw = Math.min(slot * 0.62, 34);
  const cx = (i: number) => padX + slot * i + slot / 2;
  const showEach = labelAll ?? n <= 6;
  const green = "#34d399", red = "#f87171";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id={`bp${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.95} />
          <stop offset="100%" stopColor={color} stopOpacity={0.15} />
        </linearGradient>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={green} stopOpacity={0.95} />
          <stop offset="100%" stopColor={green} stopOpacity={0.15} />
        </linearGradient>
        <linearGradient id={`br${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={red} stopOpacity={0.95} />
          <stop offset="100%" stopColor={red} stopOpacity={0.15} />
        </linearGradient>
      </defs>
      {min < 0 && (
        <line x1={padX} x2={w - padX} y1={zeroY} y2={zeroY} stroke="#3f3f46" strokeDasharray="3 3" strokeWidth={1} />
      )}
      {pts.map((p, i) => {
        const neg = p.v < 0;
        const top = Math.min(y(p.v), zeroY);
        const bh = Math.max(1.5, Math.abs(y(p.v) - zeroY));
        const r = Math.min(4, bw / 2, bh);
        const fill = diverge ? (neg ? `url(#br${uid})` : `url(#bg${uid})`) : `url(#bp${uid})`;
        // path con esquinas redondeadas solo del lado "de afuera" del cero.
        const x0 = cx(i) - bw / 2, x1 = cx(i) + bw / 2;
        const d = neg
          ? `M${x0} ${top} L${x0} ${top + bh - r} Q${x0} ${top + bh} ${x0 + r} ${top + bh} L${x1 - r} ${top + bh} Q${x1} ${top + bh} ${x1} ${top + bh - r} L${x1} ${top} Z`
          : `M${x0} ${top + r} Q${x0} ${top} ${x0 + r} ${top} L${x1 - r} ${top} Q${x1} ${top} ${x1} ${top + r} L${x1} ${top + bh} L${x0} ${top + bh} Z`;
        return <path key={p.k} d={d} fill={fill} />;
      })}
      {pts.map((p, i) => {
        if (!showEach && i !== n - 1) return null;
        const neg = p.v < 0;
        const ly = neg ? Math.min(y(p.v), zeroY) + Math.abs(y(p.v) - zeroY) + 9 : Math.min(y(p.v), zeroY) - 4;
        return (
          <text key={"v" + p.k} x={cx(i)} y={ly} textAnchor="middle"
            fill={diverge ? (neg ? red : green) : color} style={{ fontSize: 9.5, fontWeight: 600 }}>
            {fmtNum(p.v)}{unit}
          </text>
        );
      })}
      {pts.map((p, i) => (
        <text key={"x" + p.k} x={cx(i)} y={h - 5} textAnchor="middle" className="fill-zinc-600" style={{ fontSize: 9 }}>
          {labelKey(p.k)}
        </text>
      ))}
    </svg>
  );
}

export function FundChart({
  data,
  color = "#60a5fa",
  unit = "",
  w = 300,
  h = 130,
}: {
  data: Record<string, number>;
  color?: string;
  unit?: string;
  w?: number;
  h?: number;
}) {
  // Soporta claves anuales ("2025") y trimestrales ("2025Q2").
  const ord = (k: string) => (k.includes("Q") ? Number(k.slice(0, 4)) * 4 + Number(k.slice(5)) : Number(k) * 4);
  const label = (k: string) => (k.includes("Q") ? `${k.slice(5)}T${k.slice(2, 4)}` : k);
  const keys = Object.keys(data).sort((a, b) => ord(a) - ord(b));
  const pts = keys.map((k) => ({ k, v: data[k] }));
  if (pts.length < 2) return <div className="grid h-[130px] place-items-center text-xs text-zinc-600">sin datos</div>;

  const vals = pts.map((p) => p.v);
  let min = Math.min(...vals, 0);
  let max = Math.max(...vals, 0);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12;
  min -= pad; max += pad;
  const padX = 8, padTop = 10, padBot = 22;
  const x = (i: number) => padX + (i / (pts.length - 1)) * (w - padX * 2);
  const y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (h - padTop - padBot);

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const zeroY = min < 0 && max > 0 ? y(0) : null;
  const last = pts[pts.length - 1].v;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {zeroY != null && (
        <line x1={padX} x2={w - padX} y1={zeroY} y2={zeroY} stroke="#3f3f46" strokeDasharray="3 3" strokeWidth={1} />
      )}
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={p.k} cx={x(i)} cy={y(p.v)} r={2.5} fill={color} />
      ))}
      {pts.map((p, i) => (
        <text key={"t" + p.k} x={x(i)} y={h - 6} textAnchor="middle" className="fill-zinc-600" style={{ fontSize: 9 }}>
          {label(p.k)}
        </text>
      ))}
      <text x={w - padX} y={padTop + 2} textAnchor="end" fill={color} style={{ fontSize: 10, fontWeight: 600 }}>
        {last >= 0 ? "" : "-"}{Math.abs(last).toLocaleString("es-AR", { maximumFractionDigits: last >= 100 ? 0 : 1 })}{unit}
      </text>
    </svg>
  );
}
