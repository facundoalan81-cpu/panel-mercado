"""Sonda: qué fundamentales devuelve yfinance por tipo de papel (para el modo análisis)."""
import warnings
warnings.filterwarnings("ignore")
import yfinance as yf
from fetch import make_session

S = make_session()
TESTS = ["AMZN", "AAPL", "GGAL", "YPF", "AUSO.BA", "BTC-USD", "GC=F"]

for sym in TESTS:
    print("=" * 60)
    print(sym)
    try:
        t = yf.Ticker(sym, session=S)
        info = t.info or {}
        keys = ["longName", "sector", "industry", "marketCap", "website",
                "grossMargins", "operatingMargins", "profitMargins",
                "enterpriseToEbitda", "trailingPE", "forwardPE", "freeCashflow",
                "returnOnEquity", "revenueGrowth"]
        for k in keys:
            v = info.get(k)
            if k == "longBusinessSummary":
                continue
            print(f"  {k:20} = {v}")
        summ = info.get("longBusinessSummary")
        print(f"  summary_len          = {len(summ) if summ else 0}")
        # estados financieros anuales
        try:
            inc = t.income_stmt
            rev = inc.loc["Total Revenue"] if (inc is not None and "Total Revenue" in inc.index) else None
            print(f"  income_stmt cols     = {list(inc.columns.year) if inc is not None and len(inc.columns) else 'NONE'}")
            print(f"  Total Revenue        = {None if rev is None else [round(x/1e9,2) for x in rev.values]}")
        except Exception as e:
            print(f"  income_stmt ERROR    = {e}")
        try:
            cf = t.cashflow
            fcf = cf.loc["Free Cash Flow"] if (cf is not None and "Free Cash Flow" in cf.index) else None
            print(f"  Free Cash Flow       = {None if fcf is None else [round(x/1e9,2) for x in fcf.values]}")
        except Exception as e:
            print(f"  cashflow ERROR       = {e}")
        try:
            bs = t.balance_sheet
            shr = None
            for row in ["Ordinary Shares Number", "Share Issued"]:
                if bs is not None and row in bs.index:
                    shr = bs.loc[row]; break
            print(f"  Shares (B)           = {None if shr is None else [round(x/1e9,3) for x in shr.values]}")
        except Exception as e:
            print(f"  balance ERROR        = {e}")
    except Exception as e:
        print(f"  FATAL {e}")
