"""
Fetch RÁPIDO de solo la cotización actual (precio + % del día) para todos los símbolos.
Liviano (sin 10y ni intradía) -> corre seguido (cada ~15 min) para frescura de precios.
Salida: output/quotes-latest.json = {"t": iso, "q": {ticker: {"p": precio, "c": chg_pct}}}
El front lo lee del branch `data` (raw GitHub) y refresca los precios en vivo sin recargar.
"""
from __future__ import annotations
import json
import os
import time
from datetime import datetime, timezone

from universe import UNIVERSE
from fetch import make_session, _download, _extract

OUT = os.path.join(os.path.dirname(__file__), "output", "quotes-latest.json")


def main():
    syms = [it["yf"] for it in UNIVERSE]
    by = {it["yf"]: it["ticker"] for it in UNIVERSE}
    sess = make_session()
    frames = {}
    for i in range(0, len(syms), 60):
        chunk = syms[i:i + 60]
        for _ in range(2):
            try:
                got = _extract(_download(chunk, "5d", sess), chunk)
                frames.update(got)
                if got:
                    break
            except Exception:
                pass
            time.sleep(2)

    out = {}
    for yf, df in frames.items():
        c = df["Close"].dropna()
        if not len(c):
            continue
        chg = round((float(c.iloc[-1]) / float(c.iloc[-2]) - 1) * 100, 2) if len(c) >= 2 else None
        out[by[yf]] = {"p": round(float(c.iloc[-1]), 4), "c": chg}

    payload = {"t": datetime.now(timezone.utc).isoformat(timespec="seconds"), "q": out}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))
    print(f"quotes: {len(out)}/{len(syms)} ok | {os.path.getsize(OUT) // 1024}KB")
    return 0 if len(out) > len(syms) * 0.5 else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
