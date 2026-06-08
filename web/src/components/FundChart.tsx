"use client";

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
  const years = Object.keys(data).map(Number).sort((a, b) => a - b);
  const pts = years.map((y) => ({ y, v: data[String(y)] }));
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
        <circle key={p.y} cx={x(i)} cy={y(p.v)} r={2.5} fill={color} />
      ))}
      {pts.map((p, i) => (
        <text key={"t" + p.y} x={x(i)} y={h - 6} textAnchor="middle" className="fill-zinc-600" style={{ fontSize: 9 }}>
          {p.y}
        </text>
      ))}
      <text x={w - padX} y={padTop + 2} textAnchor="end" fill={color} style={{ fontSize: 10, fontWeight: 600 }}>
        {last >= 0 ? "" : "-"}{Math.abs(last).toLocaleString("es-AR", { maximumFractionDigits: last >= 100 ? 0 : 1 })}{unit}
      </text>
    </svg>
  );
}
