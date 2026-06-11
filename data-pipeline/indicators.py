"""
Indicadores tecnicos sobre OHLCV diario (1D) + score y clasificacion de senales.
Todo derivable de OHLCV. Sin Koncorde (propietario) -> CMF(20) como proxy de dinero.
Formulas fieles a TradingView/StockCharts (EMA con seed SMA, RSI Wilder).
Ver docs/2026-06-07-panel-mercado-spec.md seccion 4.
"""
from __future__ import annotations
import math
import numpy as np
import pandas as pd


# ----------------------------- medias -----------------------------
def sma(s: pd.Series, n: int) -> pd.Series:
    return s.rolling(n).mean()


def ema(s: pd.Series, n: int) -> pd.Series:
    """EMA con seed = SMA(n) de los primeros n (como ta.ema de TradingView)."""
    k = 2.0 / (n + 1.0)
    out = np.full(len(s), np.nan)
    vals = s.to_numpy(dtype=float)
    if len(vals) < n:
        return pd.Series(out, index=s.index)
    seed = np.nanmean(vals[:n])
    out[n - 1] = seed
    for i in range(n, len(vals)):
        prev = out[i - 1]
        cur = vals[i]
        if math.isnan(cur):
            out[i] = prev
        else:
            out[i] = cur * k + prev * (1.0 - k)
    return pd.Series(out, index=s.index)


# ----------------------------- RSI Wilder -----------------------------
def rsi(s: pd.Series, n: int = 14) -> pd.Series:
    delta = s.diff()
    gain = delta.clip(lower=0.0)
    loss = (-delta).clip(lower=0.0)
    out = np.full(len(s), np.nan)
    g = gain.to_numpy(dtype=float)
    l = loss.to_numpy(dtype=float)
    if len(s) <= n:
        return pd.Series(out, index=s.index)
    avg_gain = np.nanmean(g[1:n + 1])
    avg_loss = np.nanmean(l[1:n + 1])
    def _rsi(ag, al):
        if al == 0:
            return 100.0
        rs = ag / al
        return 100.0 - 100.0 / (1.0 + rs)
    out[n] = _rsi(avg_gain, avg_loss)
    for i in range(n + 1, len(s)):
        avg_gain = (avg_gain * (n - 1) + g[i]) / n
        avg_loss = (avg_loss * (n - 1) + l[i]) / n
        out[i] = _rsi(avg_gain, avg_loss)
    return pd.Series(out, index=s.index)


# ----------------------------- MACD -----------------------------
def macd(s: pd.Series, fast: int = 12, slow: int = 26, sig: int = 9):
    line = ema(s, fast) - ema(s, slow)
    signal = ema(line.dropna(), sig).reindex(s.index)
    hist = line - signal
    return line, signal, hist


# ----------------------------- CMF (proxy dinero) -----------------------------
def cmf(df: pd.DataFrame, n: int = 20) -> pd.Series:
    high, low, close, vol = df["High"], df["Low"], df["Close"], df["Volume"]
    rng = (high - low)
    mfm = ((close - low) - (high - close)) / rng.replace(0, np.nan)
    mfm = mfm.fillna(0.0)
    mfv = mfm * vol
    denom = vol.rolling(n).sum().replace(0, np.nan)
    return mfv.rolling(n).sum() / denom


# ----------------------------- ATR / SuperTrend / WaveTrend / BBP -----------------------------
def atr(df: pd.DataFrame, n: int = 10) -> pd.Series:
    high, low, close = df["High"], df["Low"], df["Close"]
    prev = close.shift(1)
    tr = pd.concat([(high - low), (high - prev).abs(), (low - prev).abs()], axis=1).max(axis=1)
    # Wilder
    out = np.full(len(df), np.nan)
    t = tr.to_numpy(dtype=float)
    if len(t) <= n:
        return pd.Series(out, index=df.index)
    out[n] = np.nanmean(t[1:n + 1])
    for i in range(n + 1, len(t)):
        out[i] = (out[i - 1] * (n - 1) + t[i]) / n
    return pd.Series(out, index=df.index)


def supertrend(df: pd.DataFrame, n: int = 10, mult: float = 3.0):
    hl2 = (df["High"] + df["Low"]) / 2
    a = atr(df, n)
    upper = (hl2 + mult * a).to_numpy()
    lower = (hl2 - mult * a).to_numpy()
    close = df["Close"].to_numpy(dtype=float)
    st = np.full(len(df), np.nan)
    dir_up = np.full(len(df), True)
    fu, fl = upper.copy(), lower.copy()
    for i in range(1, len(df)):
        if np.isnan(upper[i]):
            continue
        if np.isnan(fu[i - 1]):
            fu[i], fl[i] = upper[i], lower[i]
        else:
            fu[i] = upper[i] if (upper[i] < fu[i - 1] or close[i - 1] > fu[i - 1]) else fu[i - 1]
            fl[i] = lower[i] if (lower[i] > fl[i - 1] or close[i - 1] < fl[i - 1]) else fl[i - 1]
        prev_up = dir_up[i - 1]
        if prev_up:
            dir_up[i] = close[i] >= fl[i]
        else:
            dir_up[i] = close[i] > fu[i]
        st[i] = fl[i] if dir_up[i] else fu[i]
    return pd.Series(st, index=df.index), pd.Series(dir_up, index=df.index)


def wavetrend(df: pd.DataFrame, n1: int = 10, n2: int = 21):
    ap = (df["High"] + df["Low"] + df["Close"]) / 3
    esa = ema(ap, n1)
    d = ema((ap - esa).abs(), n1)
    ci = (ap - esa) / (0.015 * d.replace(0, np.nan))
    tci = ema(ci.dropna(), n2).reindex(df.index)
    wt1 = tci
    wt2 = sma(wt1, 4)
    return wt1, wt2


def bbp(df: pd.DataFrame, n: int = 13) -> pd.Series:
    e = ema(df["Close"], n)
    return (df["High"] - e) + (df["Low"] - e)


# ----------------------------- señal por papel -----------------------------
def _last(s: pd.Series):
    v = s.dropna()
    return float(v.iloc[-1]) if len(v) else None


def _r(x, d=4):
    return None if x is None else round(x, d)


def _gt(a, b):
    return None if (a is None or b is None) else bool(a > b)


def compute_signal(df: pd.DataFrame, min_bars: int = 200, with_history: bool = False) -> dict:
    """df con columnas Open/High/Low/Close/Volume, index temporal asc. Devuelve dict de señal."""
    df = df.dropna(subset=["Close"]).copy()
    if len(df) < min_bars:
        return {"status": "sin_datos", "bars": len(df)}

    close, op = df["Close"], df["Open"]
    has_vol = df["Volume"].fillna(0).tail(60).sum() > 0

    sma30v = _last(sma(close, 30))
    ema20v = _last(ema(close, 20))
    ema150v = _last(ema(close, 150))
    ema200v = _last(ema(close, 200))
    rsi_s = rsi(close, 14)
    rsi_v = _last(rsi_s)
    mline, msig, mhist = macd(close)
    macd_line = _last(mline); macd_sig = _last(msig); macd_hist = _last(mhist)
    cmf_s = cmf(df, 20) if has_vol else pd.Series(dtype=float)
    cmf_v = _last(cmf_s) if has_vol else None

    price = _last(close)
    prev = close.dropna()
    chg_pct = round((price / float(prev.iloc[-2]) - 1) * 100, 2) if len(prev) >= 2 else None

    # marcos largos (semanal/mensual) pueden no tener barras para EMA150/200 -> se permiten None
    if None in (sma30v, ema20v, rsi_v, macd_hist):
        return {"status": "sin_datos", "bars": len(df)}

    op_v = _last(op)
    low_v = float(df["Low"].iloc[-1])

    above = {
        "sma30": _gt(price, sma30v), "ema20": _gt(price, ema20v),
        "ema150": _gt(price, ema150v), "ema200": _gt(price, ema200v),
    }
    above_all = all(v is True for v in above.values())
    green = op_v is not None and price > op_v
    macd_bull = (macd_hist > 0) and (macd_line > macd_sig)
    rsi_ok = rsi_v < 65
    money_bull = (cmf_v is not None) and (cmf_v > 0)

    crit = {
        "above_all_mas": above_all, "green_candle": green,
        "macd_bull": macd_bull, "rsi_healthy": rsi_ok, "money_flow_bull": money_bull,
    }
    score = sum(1 for v in crit.values() if v)
    # sin volumen: money_flow no evaluable -> cap a 4
    if cmf_v is None and score == 5:
        score = 4

    _mas_vals = [v for v in (sma30v, ema20v, ema150v, ema200v) if v is not None]
    max_ma = max(_mas_vals) if _mas_vals else price

    # clasificacion
    classification, substate, missing = "SIN_SENAL", None, None
    if rsi_v > 75:
        classification = "A_REVISAR"
    elif score == 5:
        classification = "FUERTE"
        substate = "rompiendo_ultima_media" if low_v <= max_ma < price else "sobre_las_4_medias"
    elif score == 4:
        classification = "POTENCIAL"
        if not above_all:
            missing = {"criterio": "above_all_mas",
                       "pct_para_romper": round((max_ma - price) / price * 100, 2)}
        elif not green:
            missing = {"criterio": "green_candle"}
        elif not macd_bull:
            missing = {"criterio": "macd_bull"}
        elif not rsi_ok:
            missing = {"criterio": "rsi_healthy"}
        elif not money_bull:
            missing = {"criterio": "money_flow_bull"}
    # caliente overlay (no pisa A_REVISAR)
    caliente = 70 <= rsi_v <= 75

    # horizonte
    def horiz_corto():
        if price > ema20v and price > sma30v and macd_line > macd_sig and macd_hist >= 0:
            return "alcista"
        if price < ema20v and price < sma30v and macd_line < macd_sig and macd_hist < 0:
            return "bajista"
        return "mixto"

    def horiz_largo():
        if ema150v is None or ema200v is None:
            return "transicion"
        if price > ema150v and price > ema200v and ema150v > ema200v:
            return "alcista"
        if price < ema150v and price < ema200v and ema150v < ema200v:
            return "bajista"
        return "transicion"

    money_flow = "N/A" if cmf_v is None else ("entrada" if cmf_v > 0 else ("salida" if cmf_v < 0 else "neutro"))
    macd_state = "alcista" if macd_hist > 0 else ("bajista" if macd_hist < 0 else "plano")

    # --- indicadores extra (estilo terminal) ---
    e7 = _last(ema(close, 7)); e14 = _last(ema(close, 14)); e21 = _last(ema(close, 21))
    e42 = _last(ema(close, 42)); e100 = _last(ema(close, 100)); e200x = _last(ema(close, 200))
    emas = {"e7": _r(e7), "e14": _r(e14), "e21": _r(e21), "e42": _r(e42), "e100": _r(e100), "e200": _r(e200x),
            "above": {"e7": _gt(price, e7), "e14": _gt(price, e14), "e21": _gt(price, e21),
                      "e42": _gt(price, e42), "e100": _gt(price, e100), "e200": _gt(price, e200x)}}

    st_line, st_dir = supertrend(df)
    st_val = _last(st_line)
    st_up = bool(st_dir.iloc[-1]) if len(st_dir) else None
    supertrend_o = {"value": _r(st_val), "dir": None if st_up is None else ("up" if st_up else "down")}

    wt1, wt2 = wavetrend(df)
    wt1v, wt2v = _last(wt1), _last(wt2)
    wavetrend_o = {"wt1": _r(wt1v, 2), "wt2": _r(wt2v, 2),
                   "dir": None if (wt1v is None or wt2v is None) else ("up" if wt1v >= wt2v else "down")}

    bbp_v = _last(bbp(df))
    bbp_o = {"value": _r(bbp_v, 3), "state": None if bbp_v is None else ("bull" if bbp_v >= 0 else "bear")}

    vol_avg = _last(sma(df["Volume"], 20)) if has_vol else None
    vol_last_v = float(df["Volume"].iloc[-1]) if has_vol and not pd.isna(df["Volume"].iloc[-1]) else None
    vol_o = {"value": vol_last_v,
             "rel": round(vol_last_v / vol_avg, 2) if (vol_last_v and vol_avg) else None}

    # AVWAP anclado al inicio del año en curso (YTD)
    avwap_v, avwap_pct = None, None
    if has_vol:
        try:
            tp = (df["High"] + df["Low"] + df["Close"]) / 3
            yrs = df.index.year
            anchor = int(np.argmax(yrs == yrs[-1]))
            pv = (tp * df["Volume"]).iloc[anchor:].cumsum()
            vv = df["Volume"].iloc[anchor:].cumsum().replace(0, np.nan)
            avwap_v = _last(pv / vv)
            if avwap_v and price:
                avwap_pct = round((price / avwap_v - 1) * 100, 1)
        except Exception:
            pass
    avwap_o = {"value": _r(avwap_v), "pct": avwap_pct}

    # RSI Hist = impulso del RSI (RSI - su media de 9)
    rsi_sig = _last(sma(rsi_s, 9))
    rsi_hist = _r(rsi_v - rsi_sig, 1) if (rsi_v is not None and rsi_sig is not None) else None

    # --- SESGO DIRECCIONAL: analiza todos los indicadores y resuelve alcista vs bajista ---
    flags = [
        above["ema20"], above["sma30"], above["ema150"], above["ema200"],
        (macd_state == "alcista"),
        (rsi_v >= 50),
        (None if cmf_v is None else cmf_v > 0),
        (None if st_up is None else st_up),
        (None if wavetrend_o["dir"] is None else wavetrend_o["dir"] == "up"),
        (None if bbp_o["state"] is None else bbp_o["state"] == "bull"),
    ]
    valid = [b for b in flags if b is not None]
    bull = sum(1 for b in valid if b)
    bscore = round(bull / len(valid) * 100) if valid else 50
    if bscore >= 72:
        blabel = "Alcista"
    elif bscore >= 56:
        blabel = "Más alcista"
    elif bscore > 44:
        blabel = "Mixto"
    elif bscore > 28:
        blabel = "Más bajista"
    else:
        blabel = "Bajista"
    # descripción de los drivers principales
    drv = []
    if above["ema20"] is True and above["sma30"] is True:
        drv.append("sobre medias rápidas")
    elif above["ema20"] is False and above["sma30"] is False:
        drv.append("bajo medias rápidas")
    if above["ema150"] is True and above["ema200"] is True:
        drv.append("sobre medias largas")
    elif above["ema150"] is False and above["ema200"] is False:
        drv.append("bajo medias largas")
    drv.append(f"MACD {macd_state}")
    if cmf_v is not None:
        drv.append("volumen entrando" if cmf_v > 0 else "volumen saliendo")
    if rsi_v > 75:
        drv.append("RSI sobrecomprado")
    elif rsi_v < 30:
        drv.append("RSI sobrevendido")
    _btxt = " · ".join(drv[:3])
    bias = {"label": blabel, "score": bscore, "text": (_btxt[:1].upper() + _btxt[1:]) if _btxt else ""}

    # --- ATR(14): volatilidad tipica y stop sugerido (gestion de riesgo) ---
    atr_v = _last(atr(df, 14))
    atr_o = None
    if atr_v is not None and not (isinstance(atr_v, float) and math.isnan(atr_v)) and price:
        atr_o = {"value": _r(atr_v), "pct": round(atr_v / price * 100, 2),
                 "stop": _r(price - 1.5 * atr_v)}

    # --- Tesis: que esta a favor, que en contra, y que nivel invalida la lectura ---
    _tnamed = [
        ("Sobre la EMA20", "Bajo la EMA20", above["ema20"]),
        ("Sobre la SMA30", "Bajo la SMA30", above["sma30"]),
        ("Sobre la EMA150", "Bajo la EMA150", above["ema150"]),
        ("Sobre la EMA200 (tendencia de fondo)", "Bajo la EMA200 (tendencia de fondo)", above["ema200"]),
        ("MACD alcista", "MACD bajista", macd_state == "alcista"),
        ("RSI con fuerza (>=50)", "RSI debil (<50)", rsi_v >= 50),
        ("Entra volumen (CMF > 0)", "Sale volumen (CMF < 0)", None if cmf_v is None else cmf_v > 0),
        ("Supertrend al alza", "Supertrend a la baja", st_up),
        ("WaveTrend al alza", "WaveTrend a la baja", None if wavetrend_o["dir"] is None else wavetrend_o["dir"] == "up"),
        ("Bollinger comprador", "Bollinger vendedor", None if bbp_o["state"] is None else bbp_o["state"] == "bull"),
    ]
    t_pros = [p for p, c, v in _tnamed if v is True]
    t_cons = [c for p, c, v in _tnamed if v is False]
    if rsi_v > 75:
        t_cons.insert(0, "RSI sobrecomprado (>75): riesgo de toma de ganancias")
    elif rsi_v < 30:
        t_pros.insert(0, "RSI sobrevendido (<30): posible rebote tecnico")
    _ma_named = [("EMA20", ema20v), ("SMA30", sma30v), ("EMA150", ema150v), ("EMA200", ema200v)]
    _below = [(n, v) for n, v in _ma_named if v is not None and v < price]
    invalida = None
    if _below:
        _n, _v = max(_below, key=lambda x: x[1])
        invalida = {"ref": _n, "nivel": _r(_v), "pct": round((_v / price - 1) * 100, 1)}
    tesis = {"pros": t_pros[:5], "cons": t_cons[:5], "invalida": invalida}

    # --- serie Miedo/Codicia (bull fraction de 5 flags por día) para el índice histórico ---
    bull_series = {}
    if with_history:
        try:
            e20s = ema(close, 20)
            comp = pd.concat([
                (close > e20s),
                (mhist > 0),
                (rsi_s >= 50),
                (cmf_s > 0) if has_vol else pd.Series(False, index=close.index),
                (st_dir.astype(bool) if len(st_dir) else pd.Series(False, index=close.index)),
            ], axis=1)
            frac = comp.mean(axis=1)
            for d, v in frac.tail(260).items():
                if v is not None and not (isinstance(v, float) and math.isnan(v)):
                    bull_series[d.strftime("%Y-%m-%d")] = round(float(v), 3)
        except Exception:
            bull_series = {}

    high_v = float(df["High"].iloc[-1])
    vol_v = df["Volume"].iloc[-1]
    ohlc = {
        "open": round(op_v, 4) if op_v is not None else None,
        "high": round(high_v, 4),
        "low": round(low_v, 4),
        "prev_close": round(float(prev.iloc[-2]), 4) if len(prev) >= 2 else None,
        "volume": None if (vol_v is None or (isinstance(vol_v, float) and math.isnan(vol_v))) else float(vol_v),
    }

    def spark(s: pd.Series, k: int = 30):
        return [None if (x is None or (isinstance(x, float) and math.isnan(x))) else round(float(x), 4)
                for x in s.tail(k).tolist()]

    return {
        "status": "ok",
        "bars": len(df),
        "price": round(price, 4), "chg_pct": chg_pct,
        "rsi": round(rsi_v, 2),
        "macd": {"line": round(macd_line, 4), "signal": round(macd_sig, 4),
                 "hist": round(macd_hist, 4), "state": macd_state},
        "mas": {"sma30": _r(sma30v), "ema20": _r(ema20v),
                "ema150": _r(ema150v), "ema200": _r(ema200v), "above": above},
        "cmf": None if cmf_v is None else round(cmf_v, 4),
        "money_flow": money_flow,
        "bias": bias,
        "atr": atr_o,
        "tesis": tesis,
        "emas": emas,
        "supertrend": supertrend_o,
        "wavetrend": wavetrend_o,
        "bbp": bbp_o,
        "vol": vol_o,
        "avwap": avwap_o,
        "rsi_hist": rsi_hist,
        "ohlc": ohlc,
        "criteria": crit,
        "score": score,
        "classification": classification,
        "substate": substate,
        "missing": missing,
        "caliente": caliente,
        "horizon": {"corto": horiz_corto(), "largo": horiz_largo()},
        "spark": {"price": spark(close), "rsi": spark(rsi_s), "macd_hist": spark(mhist)},
        "bull_series": bull_series,
    }
