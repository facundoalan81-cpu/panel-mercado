"""
Universo de papeles a seguir (~190). Derivado de las watchlists de TradingView de Facundo.
Reglas aplicadas:
  - Dedup ADR/local: se muestra SOLO el ADR (USD); el local BCBA se omite.
    Excepcion: TX (Ternium global) != TXAR (Ternium Argentina) -> ambos.
  - country: US | AR | BR | CN | GLOBAL
  - asset_class: stock | index | commodity | crypto
  - sector: GICS en español (para no-equities -> 'Índices'/'Commodities'/'Cripto')
  - defensive: tag 🛡️ (rotación de mercado), no es un grupo aparte.
Cada item: ticker (display), yf (símbolo Yahoo), name, country, sector, asset_class, defensive, is_adr
"""

def _mk(ticker, yf, name, country, sector, asset_class="stock", defensive=False, is_adr=False, tv=None, ar_panel=None):
    return {"ticker": ticker, "yf": yf, "name": name, "country": country,
            "sector": sector, "asset_class": asset_class, "defensive": defensive,
            "is_adr": is_adr, "tv": tv or ticker, "ar_panel": ar_panel}


# --- EEUU tech/grandes (ticker, yf, name, sector) ---
_US = [
    ("NVDA", "NVDA", "NVIDIA", "Tecnología"), ("TSLA", "TSLA", "Tesla", "Consumo Discrecional"),
    ("META", "META", "Meta Platforms", "Comunicaciones"), ("GOOG", "GOOG", "Alphabet", "Comunicaciones"),
    ("AMZN", "AMZN", "Amazon", "Consumo Discrecional"), ("NFLX", "NFLX", "Netflix", "Comunicaciones"),
    ("SPOT", "SPOT", "Spotify", "Comunicaciones"), ("AAPL", "AAPL", "Apple", "Tecnología"),
    ("MSFT", "MSFT", "Microsoft", "Tecnología"), ("PLTR", "PLTR", "Palantir", "Tecnología"),
    ("MU", "MU", "Micron", "Tecnología"), ("INTC", "INTC", "Intel", "Tecnología"),
    ("AVGO", "AVGO", "Broadcom", "Tecnología"), ("AMD", "AMD", "AMD", "Tecnología"),
    ("LRCX", "LRCX", "Lam Research", "Tecnología"), ("TXN", "TXN", "Texas Instruments", "Tecnología"),
    ("ASML", "ASML", "ASML", "Tecnología"), ("TSM", "TSM", "TSMC", "Tecnología"),
    ("QCOM", "QCOM", "Qualcomm", "Tecnología"), ("HMY", "HMY", "Harmony Gold", "Materiales"),
    ("B", "B", "Barnes Group", "Industriales"), ("COIN", "COIN", "Coinbase", "Financiero"),
    ("MSTR", "MSTR", "MicroStrategy", "Tecnología"), ("RIOT", "RIOT", "Riot Platforms", "Financiero"),
    ("HUT", "HUT", "Hut 8", "Financiero"),
    ("AGRO", "AGRO", "Adecoagro", "Materiales"),
    # conocidas fuera del S&P 500 actual
    ("AAL", "AAL", "American Airlines", "Industriales"), ("RIVN", "RIVN", "Rivian", "Consumo Discrecional"),
    ("LCID", "LCID", "Lucid Motors", "Consumo Discrecional"), ("SOFI", "SOFI", "SoFi", "Financiero"),
    ("HOOD", "HOOD", "Robinhood", "Financiero"), ("RBLX", "RBLX", "Roblox", "Comunicaciones"),
]

# --- ADRs argentinos (USD) ---
_ADR_AR = [
    ("BMA", "BMA", "Banco Macro", "Financiero"), ("GGAL", "GGAL", "Grupo Galicia", "Financiero"),
    ("SUPV", "SUPV", "Grupo Supervielle", "Financiero"), ("BBAR", "BBAR", "BBVA Argentina", "Financiero"),
    ("YPF", "YPF", "YPF", "Energía"), ("PAM", "PAM", "Pampa Energía", "Energía"),
    ("EDN", "EDN", "Edenor", "Utilities"), ("TEO", "TEO", "Telecom Argentina", "Comunicaciones"),
    ("MELI", "MELI", "MercadoLibre", "Consumo Discrecional"), ("TGS", "TGS", "Transportadora Gas del Sur", "Energía"),
    ("VIST", "VIST", "Vista Energy", "Energía"), ("GLOB", "GLOB", "Globant", "Tecnología"),
    ("CRESY", "CRESY", "Cresud", "Materiales"), ("CEPU", "CEPU", "Central Puerto", "Utilities"),
    ("LOMA", "LOMA", "Loma Negra", "Materiales"), ("TX", "TX", "Ternium", "Materiales"),
    ("IRS", "IRS", "IRSA", "Inmobiliario"),
]

# --- Índices / Commodities / Cripto ---
_MACRO = [
    _mk("SPY", "SPY", "S&P 500 ETF", "GLOBAL", "Índices", "index"),
    _mk("QQQ", "QQQ", "Nasdaq 100 ETF", "GLOBAL", "Índices", "index"),
    _mk("DIA", "DIA", "Dow Jones ETF", "GLOBAL", "Índices", "index"),
    _mk("IWM", "IWM", "Russell 2000 ETF", "GLOBAL", "Índices", "index"),
    _mk("FXI", "FXI", "China Large-Cap ETF", "GLOBAL", "Índices", "index"),
    _mk("EWZ", "EWZ", "Brazil ETF", "GLOBAL", "Índices", "index"),
    _mk("VIX", "^VIX", "Volatility Index", "GLOBAL", "Índices", "index", tv="TVC:VIX"),
    _mk("NQ", "NQ=F", "Nasdaq Future", "GLOBAL", "Índices", "index", tv="CME_MINI:NQ1!"),
    _mk("ES", "ES=F", "S&P 500 Future", "GLOBAL", "Índices", "index", tv="CME_MINI:ES1!"),
    _mk("YM", "YM=F", "Dow Future", "GLOBAL", "Índices", "index", tv="CBOT_MINI:YM1!"),
    _mk("GOLD", "GC=F", "Oro", "GLOBAL", "Commodities", "commodity", tv="TVC:GOLD"),
    _mk("SILVER", "SI=F", "Plata", "GLOBAL", "Commodities", "commodity", tv="TVC:SILVER"),
    _mk("COPPER", "HG=F", "Cobre", "GLOBAL", "Commodities", "commodity", tv="COMEX:HG1!"),
    _mk("USOIL", "CL=F", "Petróleo WTI", "GLOBAL", "Commodities", "commodity", tv="TVC:USOIL"),
    _mk("NATGAS", "NG=F", "Gas Natural", "GLOBAL", "Commodities", "commodity", tv="NYMEX:NG1!"),
    _mk("BTCUSD", "BTC-USD", "Bitcoin", "GLOBAL", "Cripto", "crypto", tv="BTCUSD"),
    _mk("ETHUSD", "ETH-USD", "Ethereum", "GLOBAL", "Cripto", "crypto", tv="ETHUSD"),
]

# --- Brasil (ADRs en US) ---
_BR = [
    ("NU", "NU", "Nubank", "Financiero"), ("PAGS", "PAGS", "PagSeguro", "Financiero"),
    ("STNE", "STNE", "StoneCo", "Financiero"), ("BBD", "BBD", "Banco Bradesco", "Financiero"),
    ("PBR", "PBR", "Petrobras", "Energía"), ("VALE", "VALE", "Vale", "Materiales"),
]

# --- China (ADRs en US) ---
_CN = [
    ("JD", "JD", "JD.com", "Consumo Discrecional"), ("BABA", "BABA", "Alibaba", "Consumo Discrecional"),
    ("NIO", "NIO", "NIO", "Consumo Discrecional"), ("BIDU", "BIDU", "Baidu", "Comunicaciones"),
]

# --- BCBA Panel Líder (ARS, .BA) — solo los que NO tienen ADR mostrado ---
_BCBA_LIDER = [
    ("ALUA", "ALUA.BA", "Aluar", "Materiales"), ("BYMA", "BYMA.BA", "Bolsas y Mercados Argentinos", "Financiero"),
    ("COME", "COME.BA", "Soc. Comercial del Plata", "Industriales"), ("HARG", "HARG.BA", "Holcim Argentina", "Materiales"),
    ("METR", "METR.BA", "Metrogas", "Utilities"), ("MIRG", "MIRG.BA", "Mirgor", "Industriales"),
    ("TRAN", "TRAN.BA", "Transener", "Utilities"), ("TXAR", "TXAR.BA", "Ternium Argentina", "Materiales"),
    ("VALO", "VALO.BA", "Grupo Fin. Valores", "Financiero"),
]

# --- BCBA Panel General (ARS, .BA) — best-effort, varios pueden quedar 'sin datos' ---
_BCBA_GRAL = [
    ("AUSO", "AUSO.BA", "Autopistas del Sol", "Industriales"), ("BHIP", "BHIP.BA", "Banco Hipotecario", "Financiero"),
    ("BOLT", "BOLT.BA", "Boldt", "Consumo Discrecional"), ("BPAT", "BPAT.BA", "Banco Patagonia", "Financiero"),
    ("CADO", "CADO.BA", "Carlos Casado", "Materiales"), ("CAPX", "CAPX.BA", "Capex", "Energía"),
    ("CARC", "CARC.BA", "Carboclor", "Materiales"), ("CECO2", "CECO2.BA", "Central Costanera", "Utilities"),
    ("CELU", "CELU.BA", "Celulosa Argentina", "Materiales"), ("CGPA2", "CGPA2.BA", "Camuzzi Gas Pampeana", "Utilities"),
    ("CTIO", "CTIO.BA", "Consultatio", "Inmobiliario"), ("CVH", "CVH.BA", "Cablevisión Holding", "Comunicaciones"),
    ("DGCU2", "DGCU2.BA", "Dist. Gas Cuyana", "Utilities"), ("FERR", "FERR.BA", "Ferrum", "Industriales"),
    ("FIPL", "FIPL.BA", "Fiplasto", "Materiales"), ("GAMI", "GAMI.BA", "Boldt Gaming", "Consumo Discrecional"),
    ("GBAN", "GBAN.BA", "Gas Natural Ban", "Utilities"), ("GCLA", "GCLA.BA", "Grupo Clarín", "Comunicaciones"),
    ("GRIM", "GRIM.BA", "Grimoldi", "Consumo Discrecional"), ("HAVA", "HAVA.BA", "Havanna", "Consumo Discrecional"),
    ("INVJ", "INVJ.BA", "Inversora Juramento", "Consumo Básico"), ("LEDE", "LEDE.BA", "Ledesma", "Consumo Básico"),
    ("MOLI", "MOLI.BA", "Molinos Río de la Plata", "Consumo Básico"), ("MOLA", "MOLA.BA", "Molinos Agro", "Consumo Básico"),
    ("MORI", "MORI.BA", "Morixe", "Consumo Básico"), ("OEST", "OEST.BA", "Grupo Conc. del Oeste", "Industriales"),
    ("PATA", "PATA.BA", "Importadora Patagonia", "Consumo Básico"), ("SAMI", "SAMI.BA", "S.A. San Miguel", "Consumo Básico"),
    ("SEMI", "SEMI.BA", "Molinos Juan Semino", "Consumo Básico"),
]

# --- Defensivas US (tag 🛡️) ---
_DEF_STAPLES = ["WMT","COST","KO","PEP","PG","CL","KMB","MO","PM","GIS","KHC","K","CLX","MDLZ","KDP","HSY",
                "SYY","ADM","STZ","KR","KVUE","TSN","HRL","MKC","CHD","CAG","CPB","SJM","TAP","BG","EL","DG",
                "DLTR","TGT","MNST","WBA"]
_DEF_HEALTH = ["JNJ","UNH","LLY","ABBV","MRK","PFE","ABT","TMO","DHR","BMY","AMGN","MDT","GILD","CVS","CI",
               "ELV","ZTS","ISRG","SYK","BDX","BSX","HCA","VRTX","REGN"]
_DEF_UTIL = ["NEE","DUK","SO","D","AEP","EXC","SRE","XEL","ED","PEG","WEC","ES","DTE"]
_DEF_COMM = [("MCD","Consumo Discrecional"),("T","Comunicaciones"),("VZ","Comunicaciones"),("TMUS","Comunicaciones")]


# --- S&P 500 completo (las ~500 más conocidas de EEUU) desde sp500.csv ---
# GICS (inglés) -> sector en español del panel.
_GICS_ES = {
    "Information Technology": "Tecnología",
    "Communication Services": "Comunicaciones",
    "Consumer Discretionary": "Consumo Discrecional",
    "Consumer Staples": "Consumo Básico",
    "Health Care": "Salud",
    "Financials": "Financiero",
    "Energy": "Energía",
    "Materials": "Materiales",
    "Industrials": "Industriales",
    "Utilities": "Utilities",
    "Real Estate": "Inmobiliario",
}
# Sectores que rotan como defensivos (tag 🛡️).
_DEF_SECTORS = {"Consumo Básico", "Utilities"}


def _load_sp500():
    """Lee sp500.csv (Symbol, Security, GICS Sector). Devuelve (lista de _mk, dict symbol->name)."""
    import csv
    import os
    path = os.path.join(os.path.dirname(__file__), "sp500.csv")
    rows, names = [], {}
    try:
        with open(path, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                sym = (r.get("Symbol") or "").strip()
                nm = (r.get("Security") or sym).strip()
                gics = (r.get("GICS Sector") or "").strip()
                if not sym:
                    continue
                sec = _GICS_ES.get(gics, "Industriales")
                yf = sym.replace(".", "-")  # Yahoo: BRK.B -> BRK-B
                names[yf] = nm
                rows.append(_mk(sym, yf, nm, "US", sec,
                                defensive=(sec in _DEF_SECTORS), tv=sym))
    except FileNotFoundError:
        pass
    return rows, names


def _build():
    u = []
    # 1) Entradas curadas primero -> ganan el dedup (nombres lindos, is_adr, tv especiales, defensive).
    for t, yf, name, sec in _US:
        u.append(_mk(t, yf, name, "US", sec))
    for t, yf, name, sec in _ADR_AR:
        u.append(_mk(t, yf, name, "AR", sec, is_adr=True, ar_panel="lider"))
    u.extend(_MACRO)
    for t, yf, name, sec in _BR:
        u.append(_mk(t, yf, name, "BR", sec, is_adr=True))
    for t, yf, name, sec in _CN:
        u.append(_mk(t, yf, name, "CN", sec, is_adr=True))
    for t, yf, name, sec in _BCBA_LIDER:
        u.append(_mk(t, yf, name, "AR", sec, tv=f"BCBA:{t}", ar_panel="lider"))
    for t, yf, name, sec in _BCBA_GRAL:
        u.append(_mk(t, yf, name, "AR", sec, tv=f"BCBA:{t}", ar_panel="general"))
    for t in _DEF_STAPLES:
        u.append(_mk(t, t, t, "US", "Consumo Básico", defensive=True))
    for t in _DEF_HEALTH:
        u.append(_mk(t, t, t, "US", "Salud", defensive=True))
    for t in _DEF_UTIL:
        u.append(_mk(t, t, t, "US", "Utilities", defensive=True))
    for t, sec in _DEF_COMM:
        u.append(_mk(t, t, t, "US", sec, defensive=True))
    # 2) S&P 500 completo (rellena todo lo que falte: aerolíneas, petróleo, etc.)
    sp, sp_names = _load_sp500()
    u.extend(sp)
    # dedup por símbolo yf (curadas ganan por orden)
    seen, out = set(), []
    for it in u:
        if it["yf"] in seen:
            continue
        seen.add(it["yf"])
        out.append(it)
    # backfill: a las defensivas/curadas con name == ticker, ponerles el nombre real del S&P
    for it in out:
        if it["name"] == it["ticker"] and it["yf"] in sp_names:
            it["name"] = sp_names[it["yf"]]
    return out


UNIVERSE = _build()

if __name__ == "__main__":
    from collections import Counter
    print("total:", len(UNIVERSE))
    print("por país:", dict(Counter(x["country"] for x in UNIVERSE)))
    print("por clase:", dict(Counter(x["asset_class"] for x in UNIVERSE)))
    print("defensivas:", sum(1 for x in UNIVERSE if x["defensive"]))
    print("sectores:", dict(Counter(x["sector"] for x in UNIVERSE)))
