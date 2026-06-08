"""
Orquesta: fetch OHLCV -> calcula indicadores/score/clasificación -> escribe signals-latest.json
Salida: data-pipeline/output/signals-latest.json (en prod se sube a Cloudflare R2).
"""
from __future__ import annotations
import json
import os
import sys
from collections import Counter
from datetime import datetime, timezone

from universe import UNIVERSE
from indicators import compute_signal
from fetch import fetch_all, fetch_intraday

OUT_DIR = os.path.join(os.path.dirname(__file__), "output")

# Marcos temporales calculados por resampleo del diario (no cambian intradía -> update diario alcanza).
_AGG = {"Open": "first", "High": "max", "Low": "min", "Close": "last", "Volume": "sum"}
# (clave_tf, regla pandas, min_barras)
_TF = [("1w", "W", 120), ("1m", "ME", 40), ("3m", "QE", 20)]


def _resample(df, rule):
    return df.resample(rule).agg(_AGG).dropna(subset=["Close"])


def _norm(sig):
    if sig.get("status") == "sin_datos":
        return {"status": "sin_datos", "bars": sig.get("bars", 0), "score": None, "classification": "SIN_DATOS"}
    # los marcos no necesitan spark/ohlc (el front usa los del diario) -> aliviana el JSON
    sig.pop("spark", None)
    sig.pop("ohlc", None)
    return sig


def _tf_signals(df):
    out = {}
    for key, rule, mb in _TF:
        try:
            sig = compute_signal(_resample(df, rule), min_bars=mb)
        except Exception:
            sig = {"status": "sin_datos", "bars": 0}
        out[key] = _norm(sig)
    return out


def _intraday_tf(f5, f60):
    """Señales intradía a partir de barras 5m (→ 5m/15m) y 60m (→ 1h/4h)."""
    out = {}
    specs = []
    if f5 is not None and len(f5):
        specs += [("5m", f5, 40), ("15m", _resample(f5, "15min"), 40), ("45m", _resample(f5, "45min"), 30)]
    if f60 is not None and len(f60):
        specs += [("1h", f60, 40), ("4h", _resample(f60, "4h"), 20)]
    for key, rs, mb in specs:
        try:
            sig = compute_signal(rs, min_bars=mb)
        except Exception:
            sig = {"status": "sin_datos", "bars": 0}
        out[key] = _norm(sig)
    return out


def _exchange(it):
    if it["asset_class"] != "stock":
        return it["asset_class"]
    if it["yf"].endswith(".BA"):
        return "BCBA"
    return "NYSE/NASDAQ"


def _currency(it):
    if it["asset_class"] == "crypto":
        return "USD"
    if it["yf"].endswith(".BA"):
        return "ARS"
    return "USD"


def main():
    symbols = [it["yf"] for it in UNIVERSE]
    print(f"Fetch de {len(symbols)} símbolos (10y diario)...")
    frames = fetch_all(symbols, period="10y")

    print("Fetch intradía 5m (1mo)...")
    intr5 = fetch_intraday(symbols, interval="5m", period="1mo")
    print("Fetch intradía 60m (3mo)...")
    intr60 = fetch_intraday(symbols, interval="60m", period="3mo")

    items = []
    for it in UNIVERSE:
        df = frames.get(it["yf"])
        has = df is not None and len(df)
        sig = compute_signal(df, with_history=True) if has else {"status": "sin_datos", "bars": 0}
        if sig.get("status") == "sin_datos":
            sig = {"status": "sin_datos", "bars": sig.get("bars", 0),
                   "score": None, "classification": "SIN_DATOS"}
        item = {
            "ticker": it["ticker"], "name": it["name"], "exchange": _exchange(it),
            "country": it["country"], "sector": it["sector"], "asset_class": it["asset_class"],
            "defensive": it["defensive"], "is_adr": it["is_adr"], "currency": _currency(it),
            "tv": it["tv"], "ar_panel": it.get("ar_panel"),
        }
        item.update(sig)  # diario (1d) en el nivel superior
        tf = _tf_signals(df) if has else {}
        tf.update(_intraday_tf(intr5.get(it["yf"]), intr60.get(it["yf"])))
        item["tf"] = tf
        items.append(item)

    def chg(sym):
        df = frames.get(sym)
        if df is None or len(df) < 2:
            return None
        c = df["Close"].dropna()
        return round((c.iloc[-1] / c.iloc[-2] - 1) * 100, 2) if len(c) >= 2 else None

    # --- Índice Miedo/Codicia (Fear & Greed) market-wide: promedio diario de bull-fraction de las ACCIONES ---
    from collections import defaultdict
    acc = defaultdict(lambda: [0.0, 0])
    for it in items:
        if it.get("asset_class") != "stock":
            continue
        for d, f in (it.get("bull_series") or {}).items():
            acc[d][0] += f
            acc[d][1] += 1
    hist = [{"d": d, "v": round(acc[d][0] / acc[d][1] * 100)} for d in sorted(acc) if acc[d][1] >= 20][-252:]

    def _ago(n):
        return hist[-1 - n]["v"] if len(hist) > n else None

    fng = {
        "value": hist[-1]["v"] if hist else 50,
        "history": hist,
        "prev": {"close": _ago(1), "week": _ago(5), "month": _ago(21), "year": _ago(251)},
    }
    for it in items:
        it.pop("bull_series", None)  # no se guarda por papel (solo alimentó el índice)

    out = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tz": "America/Argentina/Buenos_Aires",
        "market": {"spy_chg": chg("SPY"), "qqq_chg": chg("QQQ")},
        "fng": fng,
        "count": len(items),
        "items": items,
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, "signals-latest.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    # resumen
    ok = [i for i in items if i["status"] == "ok"]
    sin = [i["ticker"] for i in items if i["status"] == "sin_datos"]
    klass = Counter(i["classification"] for i in items)
    size_kb = os.path.getsize(path) / 1024
    print(f"\n== signals-latest.json escrito ({size_kb:.0f} KB) ==")
    print(f"ok: {len(ok)}/{len(items)} | sin_datos: {len(sin)}")
    print("clasificación:", dict(klass))
    if sin:
        print("sin_datos:", sin)
    fuertes = [i["ticker"] for i in items if i["classification"] == "FUERTE"]
    pot = [i["ticker"] for i in items if i["classification"] == "POTENCIAL"]
    if fuertes:
        print("FUERTES:", fuertes)
    if pot:
        print("POTENCIALES:", pot)
    return 0 if len(ok) > len(items) * 0.5 else 1  # health gate: >50% ok


if __name__ == "__main__":
    sys.exit(main())
