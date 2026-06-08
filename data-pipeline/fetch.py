"""
Fetch de OHLCV diario desde Yahoo Finance vía yfinance + curl_cffi (impersonate chrome).
Anti-bloqueo: descarga en lotes (menos requests), jitter + reintentos, sesión navegador.
Devuelve dict { yf_symbol: DataFrame(Open/High/Low/Close/Volume) }.
"""
from __future__ import annotations
import time
import random
import warnings

import pandas as pd
import yfinance as yf

warnings.filterwarnings("ignore")

# Evita "database is locked" del cache de timezones de yfinance bajo concurrencia.
try:
    import tempfile
    import os
    _cache = os.path.join(tempfile.gettempdir(), "py-yf-cache-panel")
    os.makedirs(_cache, exist_ok=True)
    yf.set_tz_cache_location(_cache)
except Exception:
    pass

try:
    from curl_cffi import requests as cffi_requests
    _HAS_CFFI = True
except Exception:
    _HAS_CFFI = False


def make_session():
    if _HAS_CFFI:
        return cffi_requests.Session(impersonate="chrome")
    return None


def _download(symbols, period, session):
    """Intenta pasar session a download; si la versión no lo soporta, sin session."""
    kw = dict(period=period, interval="1d", group_by="ticker",
              auto_adjust=False, threads=False, progress=False)
    try:
        return yf.download(symbols, session=session, **kw)
    except TypeError:
        return yf.download(symbols, **kw)


def _extract(raw: pd.DataFrame, symbols) -> dict:
    """Normaliza el resultado de yf.download a {symbol: df ohlcv}."""
    out = {}
    cols = ["Open", "High", "Low", "Close", "Volume"]
    if raw is None or len(raw) == 0:
        return out
    multi = isinstance(raw.columns, pd.MultiIndex)
    for sym in symbols:
        try:
            if multi:
                if sym not in raw.columns.get_level_values(0):
                    continue
                df = raw[sym][cols].copy()
            else:
                df = raw[cols].copy()  # caso 1 símbolo
        except Exception:
            continue
        df = df.dropna(how="all")
        if len(df):
            out[sym] = df
    return out


def _download_intraday(symbols, interval, period, session):
    kw = dict(period=period, interval=interval, group_by="ticker",
              auto_adjust=False, threads=False, progress=False)
    try:
        return yf.download(symbols, session=session, **kw)
    except TypeError:
        return yf.download(symbols, **kw)


def fetch_intraday(symbols, interval="60m", period="3mo", batch=30, retries=2, verbose=True) -> dict:
    """Barras intradía (5m/15m/60m). Yahoo limita: 5m/15m ~60d, 60m ~730d.
    Devuelve { symbol: DataFrame }. Símbolos sin intradía (ej. .BA poco líquidos) se omiten."""
    session = make_session()
    frames = {}
    for i in range(0, len(symbols), batch):
        chunk = symbols[i:i + batch]
        got = {}
        for attempt in range(1, retries + 1):
            try:
                raw = _download_intraday(chunk, interval, period, session)
                got = _extract(raw, chunk)
                if got:
                    break
            except Exception as e:
                if verbose:
                    print(f"  intradía {interval} lote {i//batch+1} intento {attempt}: {e}")
            time.sleep(random.uniform(2, 4) * attempt)
        frames.update(got)
        if verbose:
            print(f"intradía {interval} lote {i//batch+1}: {len(got)}/{len(chunk)} ok")
        time.sleep(random.uniform(1.0, 2.5))
    return frames


def fetch_all(symbols, period="2y", batch=35, retries=3, verbose=True) -> dict:
    session = make_session()
    frames = {}
    for i in range(0, len(symbols), batch):
        chunk = symbols[i:i + batch]
        got = {}
        for attempt in range(1, retries + 1):
            try:
                raw = _download(chunk, period, session)
                got = _extract(raw, chunk)
                if got:
                    break
            except Exception as e:
                if verbose:
                    print(f"  lote {i//batch+1} intento {attempt} error: {e}")
            time.sleep(random.uniform(2, 5) * attempt)
        frames.update(got)
        if verbose:
            miss = [s for s in chunk if s not in got]
            print(f"lote {i//batch+1}: {len(got)}/{len(chunk)} ok" + (f" | faltan {miss}" if miss else ""))
        time.sleep(random.uniform(1.5, 3.5))

    # segunda pasada: reintenta individualmente los que falten (lock transitorio, etc.)
    missing = [s for s in symbols if s not in frames]
    if missing:
        if verbose:
            print(f"reintento individual: {len(missing)} símbolos")
        for sym in missing:
            for attempt in range(1, retries + 1):
                try:
                    raw = _download([sym], period, session)
                    got = _extract(raw, [sym])
                    if got:
                        frames.update(got)
                        break
                except Exception:
                    pass
                time.sleep(random.uniform(1.5, 3.0) * attempt)
    return frames


if __name__ == "__main__":
    test = ["NVDA", "AAPL", "GGAL", "YPF", "AUSO.BA", "FERR.BA", "BHIP.BA", "BTC-USD", "GC=F", "^VIX"]
    f = fetch_all(test, period="2y", batch=10)
    for s in test:
        df = f.get(s)
        if df is None:
            print(f"{s:10} SIN DATOS")
        else:
            print(f"{s:10} {len(df):4d} barras | last {df['Close'].iloc[-1]:.2f} | {df.index[-1].date()}")
