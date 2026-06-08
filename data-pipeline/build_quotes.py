"""
Fetch RÁPIDO de solo la cotización actual (precio + % del día).
Liviano (sin 10y ni intradía) -> corre seguido para frescura de precios.

Dos modos:
  (sin flag)  -> TODO el universo (~614). Sale a output/quotes-latest.json (rama `data`, cada 5 min).
  --fast      -> solo papeles "calientes" (~150: todo AR + ADRs + top US). Sale a
                 output/quotes-fast.json (rama `data-fast`, loop ~1 min). Lista chica = fetch en ~15s.

Salida: {"t": iso, "q": {ticker: {"p": precio, "c": chg_pct}}}
El front sobreescribe los precios en vivo: fast (1 min) gana sobre latest (5 min).
"""
from __future__ import annotations
import json
import os
import sys
import time
from datetime import datetime, timezone

from universe import UNIVERSE
from fetch import make_session, _download, _extract

OUTDIR = os.path.join(os.path.dirname(__file__), "output")

# Papeles del carril RÁPIDO. Todo lo argentino entra automático (ar_panel / is_adr).
HOT_US = {
    "AAPL", "MSFT", "NVDA", "GOOGL", "GOOG", "AMZN", "META", "TSLA", "AVGO", "AMD",
    "NFLX", "INTC", "ORCL", "CRM", "ADBE", "CSCO", "QCOM", "TXN", "IBM", "MU",
    "JPM", "BAC", "WFC", "GS", "MS", "C", "V", "MA", "PYPL", "AXP",
    "BRK-B", "UNH", "JNJ", "LLY", "PFE", "MRK", "ABBV", "TMO",
    "XOM", "CVX", "COP", "OXY", "SLB",
    "WMT", "COST", "HD", "MCD", "NKE", "SBUX", "KO", "PEP", "PG", "DIS",
    "BA", "CAT", "GE", "F", "GM", "UBER", "ABNB",
    "T", "VZ", "TMUS",
    "PLTR", "COIN", "HOOD", "SOFI", "MSTR", "MARA", "RIOT", "RIVN", "LCID", "NIO",
    "GME", "AMC", "SNAP", "PINS", "RBLX", "DKNG", "SHOP", "SQ", "ROKU", "DDOG",
    "SPY", "QQQ", "DIA", "IWM",
}


def fast_items():
    """Subconjunto chico: todo AR + ADRs + megacaps/populares US."""
    return [it for it in UNIVERSE
            if it.get("ar_panel") or it.get("is_adr") or it["ticker"] in HOT_US]


def main():
    fast = "--fast" in sys.argv
    items = fast_items() if fast else UNIVERSE
    out_path = os.path.join(OUTDIR, "quotes-fast.json" if fast else "quotes-latest.json")

    syms = [it["yf"] for it in items]
    by = {it["yf"]: it["ticker"] for it in items}
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
    os.makedirs(OUTDIR, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))
    print(f"quotes{'(fast)' if fast else ''}: {len(out)}/{len(syms)} ok | {os.path.getsize(out_path) // 1024}KB")
    return 0 if len(out) > len(syms) * 0.5 else 1


if __name__ == "__main__":
    sys.exit(main())
