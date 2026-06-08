"""
Pipeline de FUNDAMENTALES (para el modo análisis). Corre SEMANAL (cambian lento).
Por cada acción: info (KPIs, descripción, sector, market cap) + estados financieros
anuales (revenue, free cash flow, acciones=dilución). Cripto/commodities/índices se omiten.
Throttle fuerte + curl_cffi + tolerante a fallos (parcial sirve, se mergea con lo previo).
Salida: output/fundamentals-latest.json  (keyed por ticker).
"""
from __future__ import annotations
import json
import os
import sys
import time
import random
import warnings

warnings.filterwarnings("ignore")
import yfinance as yf

from universe import UNIVERSE
from fetch import make_session

OUT = os.path.join(os.path.dirname(__file__), "output", "fundamentals-latest.json")


def _years(df):
    try:
        return [int(c.year) for c in df.columns]
    except Exception:
        return []


def _row(df, names):
    for n in names:
        if df is not None and n in df.index:
            return df.loc[n]
    return None


def _series(df, names, scale=1e9):
    """Devuelve dict {year: value} en miles de millones, ascendente."""
    r = _row(df, names)
    if r is None:
        return {}
    out = {}
    for col, val in r.items():
        try:
            y = int(col.year)
            if val is not None and val == val:  # no NaN
                out[y] = round(float(val) / scale, 3)
        except Exception:
            pass
    return out


def fetch_one(it, session):
    t = yf.Ticker(it["yf"], session=session)
    info = t.info or {}
    if not info.get("longName") and not info.get("shortName"):
        return None
    inc = t.income_stmt
    cf = t.cashflow
    bs = t.balance_sheet

    rev = _series(inc, ["Total Revenue", "Operating Revenue"])
    fcf = _series(cf, ["Free Cash Flow"])
    shares = _series(bs, ["Ordinary Shares Number", "Share Issued"], scale=1e6)  # en millones

    fcf_margin = None
    if rev and info.get("freeCashflow"):
        latest_rev_b = rev[max(rev)]
        if latest_rev_b:
            fcf_margin = round((info["freeCashflow"] / 1e9) / latest_rev_b, 4)

    def g(k):
        v = info.get(k)
        return None if v is None else (round(v, 4) if isinstance(v, float) else v)

    return {
        "name": info.get("longName") or info.get("shortName"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "website": info.get("website"),
        "summary": info.get("longBusinessSummary"),
        "market_cap": info.get("marketCap"),
        "currency": info.get("financialCurrency") or info.get("currency"),
        "gross_margin": g("grossMargins"),
        "op_margin": g("operatingMargins"),
        "profit_margin": g("profitMargins"),
        "fcf_margin": fcf_margin,
        "ev_ebitda": g("enterpriseToEbitda"),
        "pe": g("trailingPE"),
        "fwd_pe": g("forwardPE"),
        "roe": g("returnOnEquity"),
        "rev_growth": g("revenueGrowth"),
        "annual_return": g("52WeekChange"),
        "revenue": rev,   # {year: B}
        "fcf": fcf,        # {year: B}
        "shares": shares,  # {year: M}
    }


def main():
    stocks = [it for it in UNIVERSE if it["asset_class"] == "stock"]
    only = sys.argv[1].split(",") if len(sys.argv) > 1 else None
    if only:
        stocks = [it for it in stocks if it["ticker"] in only]
    print(f"Fundamentales de {len(stocks)} acciones...")

    # merge con lo previo (no perder lo que ya teníamos si una corrida falla)
    data = {}
    if os.path.exists(OUT):
        try:
            data = json.load(open(OUT))
        except Exception:
            data = {}

    session = make_session()
    ok = 0
    for i, it in enumerate(stocks):
        try:
            fund = fetch_one(it, session)
            if fund:
                data[it["ticker"]] = fund
                ok += 1
                tag = "ok"
            else:
                tag = "vacío"
        except Exception as e:
            tag = f"err {str(e)[:40]}"
        print(f"[{i+1}/{len(stocks)}] {it['ticker']:8} {tag}")
        time.sleep(random.uniform(0.6, 1.4))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    size = os.path.getsize(OUT) / 1024
    print(f"\nfundamentals-latest.json: {len(data)} tickers, {size:.0f} KB (ok esta corrida: {ok})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
