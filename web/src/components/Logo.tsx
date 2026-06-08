"use client";

import { useState } from "react";
import type { Signal } from "@/lib/types";

const HUES = [210, 145, 280, 25, 340, 190, 50, 110, 0, 260];
function hue(t: string) {
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % HUES.length;
  return HUES[h];
}

function logoUrl(s: Signal): string | null {
  if (s.asset_class === "crypto") {
    const base = s.ticker.replace(/USD$/, "").toLowerCase();
    return `https://assets.coincap.io/assets/icons/${base}@2x.png`;
  }
  if (s.asset_class === "stock" && (s.country === "US" || s.is_adr)) {
    return `https://financialmodelingprep.com/image-stock/${s.ticker}.png`;
  }
  return null;
}

export function Logo({ s, size = 22 }: { s: Signal; size?: number }) {
  const [failed, setFailed] = useState(false);
  const url = logoUrl(s);
  const initials = s.ticker.replace(/[^A-Z0-9]/gi, "").slice(0, 2).toUpperCase();

  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full bg-white object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  const h = hue(s.ticker);
  return (
    <span
      className="nums grid shrink-0 place-items-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `hsl(${h} 45% 22%)`,
        color: `hsl(${h} 75% 70%)`,
      }}
    >
      {initials}
    </span>
  );
}
