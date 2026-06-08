"use client";

function pathFrom(vals: (number | null)[], w: number, h: number, pad = 2) {
  const nums = vals.map((v) => (v == null ? NaN : v));
  const valid = nums.filter((n) => !Number.isNaN(n));
  if (valid.length < 2) return { d: "", min: 0, max: 0 };
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const n = nums.length;
  const x = (i: number) => pad + (i / (n - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  let d = "";
  nums.forEach((v, i) => {
    if (Number.isNaN(v)) return;
    d += (d === "" ? "M" : "L") + x(i).toFixed(1) + " " + y(v).toFixed(1) + " ";
  });
  return { d, min, max, x, y };
}

export function LineSpark({
  vals,
  color = "#22c55e",
  w = 440,
  h = 80,
  fill = false,
  guides,
}: {
  vals: (number | null)[];
  color?: string;
  w?: number;
  h?: number;
  fill?: boolean;
  guides?: { v: number; min: number; max: number }[]; // líneas horizontales (ej RSI 30/70)
}) {
  const { d } = pathFrom(vals, w, h);
  if (!d) return <div className="text-xs text-zinc-600">sin datos</div>;
  // guías opcionales en escala fija (RSI 0-100)
  const guideLines = guides?.map((g, i) => {
    const y = h - 2 - ((g.v - g.min) / (g.max - g.min || 1)) * (h - 4);
    return (
      <line key={i} x1={2} x2={w - 2} y1={y} y2={y} stroke="#3f3f46" strokeDasharray="3 3" strokeWidth={1} />
    );
  });
  const areaD = fill ? d + `L ${w - 2} ${h - 2} L 2 ${h - 2} Z` : "";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
      {guideLines}
      {fill && <path d={areaD} fill={color} opacity={0.12} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function HistSpark({ vals, w = 440, h = 70 }: { vals: (number | null)[]; w?: number; h?: number }) {
  const nums = vals.map((v) => (v == null ? 0 : v));
  const max = Math.max(1, ...nums.map((n) => Math.abs(n)));
  const n = nums.length;
  const bw = (w - 4) / n;
  const mid = h / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
      <line x1={2} x2={w - 2} y1={mid} y2={mid} stroke="#3f3f46" strokeWidth={1} />
      {nums.map((v, i) => {
        const bh = (Math.abs(v) / max) * (mid - 2);
        return (
          <rect
            key={i}
            x={2 + i * bw + 0.5}
            y={v >= 0 ? mid - bh : mid}
            width={Math.max(1, bw - 1)}
            height={bh}
            fill={v >= 0 ? "#22c55e" : "#ef4444"}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}
