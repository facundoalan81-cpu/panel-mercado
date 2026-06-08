# DESIGN SPEC — Panel de Análisis de Mercado (v1)

**Fecha:** 2026-06-07 · **Owner:** Facundo Alan · **Audiencia del doc:** dev que implementa
**Objetivo:** dashboard web **público, gratuito y autónomo** de señales de mercado. La gente entra a un link y ve, por papel, el estado de los indicadores y si hay señal de compra. Es informativo/visual — no ejecuta órdenes. Complementa (no reemplaza) las alertas del grupo de WhatsApp.

---

## 1. Alcance v1

### Entra
- Dashboard **público, read-only, sin login**, estilo dark trading-terminal (referencia visual: ozono-bot.vercel.app).
- Universo: acciones EEUU, ADRs argentinos (USD), **BCBA / Panel Líder + Panel General (ARS)**, Brasil, China, índices, commodities, cripto.
- Por papel: precio + %día, **score 0–5**, clasificación, **RSI**, **MACD**, **posición vs las 4 medias**, money-flow.
- Indicadores 100% calculables desde OHLCV diario (1D): **SMA30, EMA20, EMA150, EMA200, RSI(14), MACD(12,26,9), CMF(20)**.
- Lectura de **horizonte corto y largo**.
- **Filtros libres** (país, sector, tipo de señal, horizonte, RSI, buscador) + **listas de seguimiento personalizadas** por usuario (en el navegador).
- Actualización **1 vez por día** post-cierre, automática, sin máquina personal.

### NO entra (v1)
- **Sin Koncorde** → reemplazado por **CMF(20)** (proxy de dinero institucional calculable).
- **Sin throwback** (ni por media ni por línea) → fórmula de throwback-por-media queda como stub comentado para v2.
- **Sin login / sin paywall** → link abierto. (Login + sync entre dispositivos = v2.)
- Sin trading, sin botones comprar/vender, sin alertas push, sin backtesting, sin intradía/streaming.
- Sin base de datos relacional (un blob JSON diario alcanza).

---

## 2. Arquitectura (toda en free tier, sin tu Mac)

```
GitHub Actions (cron diario · repo PÚBLICO = minutos ilimitados)
  job Python:
    1. fetch OHLCV  → yfinance (US/ADR/BR/CN/índices/commodities/cripto + BCBA .BA)
                      └ data912 /live  (fallback last-price BCBA Panel General)
    2. valida series (≥250 barras, sin volumen 0 al final)
    3. calcula indicadores + score + clasificación (pandas/numpy)
    4. cachea last-good → si falla, degrada a "stale", nunca vacío
    5. escribe signals-latest.json (1 objeto, sobreescribe)
          │ PUT (boto3, S3-compatible)
          ▼
Cloudflare R2 (free permanente: 10GB, EGRESS $0, ~1 write/día)
   bucket público → https://<pub-url>/signals-latest.json
          │ fetch ISR (revalidate ~3600s)
          ▼
Next.js App Router en Vercel (Hobby free)
   - server component lee R2 con ISR → CDN cache
   - try/catch: si R2 falla, sirve último build + badge "datos de <ts>"
   - UI shadcn/ui: tabla densa + drawer detalle + filtros client-side
          │ HTTPS
          ▼
Visitante (entra al link, ve la app en <2s)
```

### Servicios y por qué free
| Capa | Servicio | Por qué |
|---|---|---|
| Cómputo/cron | **GitHub Actions** (repo público) | Minutos **ilimitados** en públicos. Límite job 6h, sin presión de timeout. |
| Storage | **Cloudflare R2** (Standard) | 10GB, 1M writes/mes, **egress $0 para siempre**. Usamos ~1 write/día. |
| Front/CDN | **Vercel Hobby** | Página estática vía ISR desde CDN. 100GB BW/mes, sobra. |

### Descartado (con motivo)
- **Commit del JSON al repo:** infla git y dispara redeploy en cada push.
- **Vercel Blob:** cap 1GB, hard-stop 30 días si te pasás.
- **Supabase:** overkill (no hace falta SQL) + **auto-pause a los 7 días** sin actividad → si el job falla una semana, se cae el dashboard.
- **All-Vercel (cron+JS, sin Python):** muro de **60s** por función para ~190 símbolos + cron impreciso (±59 min) + reescribir pandas en JS.
- **tvdatafeed:** depende de sesión TradingView, no headless-friendly.

---

## 3. Fuente de datos

### 3.1 Elegida + plan B
- **Primaria: yfinance (Yahoo Finance).** Cubre US, ADRs, **BCBA Panel General en ARS** con 250+ barras (verificado en vivo: `AUSO.BA` ~520 barras, `FERR.BA` 631, `BHIP.BA` 552). Gratis, sin API key.
- **Plan B BCBA (solo last-price): data912 `/live/arg_stocks`** (free, sin auth, 120 tickers BCBA incl. AUSO/BHIP/CADO/FERR/OEST/SAMI). **NO usar su `/historical`** (archivo termina en 2017, inservible para EMA200).
- **Estrategia dual del leg argentino:** sembrar EMA200 **una vez** desde Yahoo, después actualizar cierre diario con data912 si Yahoo bloquea → día bloqueado = "stale", no "vacío".

### 3.2 Mapeo de símbolos (ejemplos)
| Mercado | Convención | Ejemplos |
|---|---|---|
| EEUU | plano | `AAPL`, `NVDA`, `MSFT` |
| ADR argentino | plano (NYSE) | `GGAL`, `YPF`, `PAM`, `BMA`, `CEPU` |
| **BCBA (ARS)** | sufijo `.BA` | `GGAL.BA`, `YPFD.BA`, `PAMP.BA`, `ALUA.BA`, `AUSO.BA`, `FERR.BA` |
| Brasil | sufijo `.SA` | `PETR4.SA`, `VALE3.SA` |
| China | `.HK` / ADR plano | `BABA`, `9988.HK`, `JD` |
| Índices | prefijo `^` | `^GSPC`, `^IXIC`, `^MERV` |
| Commodities | futuros Yahoo | `GC=F` (oro), `SI=F` (plata), `CL=F` (WTI), `HG=F` (cobre), `NG=F` (gas) |
| Cripto | `-USD` | `BTC-USD`, `ETH-USD` |

> Ojo dedup ADR/local: mostrar **solo el ADR** (TGS no TGSU2, PAM no PAMP, YPF no YPFD, GGAL no GGAL.BA, CRESY no CRES, TEO no TECO2). Excepción: **TX ≠ TXAR** (papeles distintos, no deduplicar).

### 3.3 Papeles 'sin datos' (best-effort)
- Panel General fino/ilíquido (`OEST.BA`, `CADO.BA`, `SAMI.BA`...): esperar varios "sin datos" cualquier día.
- **Regla:** serie con **<200 cierres no nulos** → marcar `sin_datos`, **no** calcular score. Sin volumen → money-flow `N/A` y **cap score a 4** con nota `sin_volumen`.
- **Garantía vs best-effort:** se garantiza el set líquido (líderes Merval + ADRs principales). Panel General profundo = best-effort con skip elegante. Nunca prometer los 190 todos los días.

### 3.4 Headless + anti-bloqueo (decisión de ejecución)
**Camino elegido (gratis, en la nube, sin Mac):** GitHub Actions corriendo el job con:
1. `curl_cffi` con `impersonate='chrome'` como `session` de yfinance.
2. **Bulk:** `yf.download(lista, period='2y', group_by='ticker')` por lotes, NO ~190 llamadas sueltas (menos requests = menos 429).
3. Jitter 1–3s + backoff exponencial + retry.
4. Cache last-good (R2) → día bloqueado degrada a "stale".
5. Health-check: si >X% de tickers fallan en una corrida, alertar (está throttleado) en vez de publicar medio dashboard.
6. Cron en minuto impar off-peak (ej. `23 22 * * 1-5` UTC, ajustar a cierre + buffer 20–30 min). GH cron tiene drift 15–60 min: asumir tolerancia.

**Escape hatch si el bloqueo se vuelve crónico:** proxy residencial (BrightData/IPRoyal, ~centavos/día para este volumen) vía `proxies=` en la sesión. Solo si hace falta — se arranca sin esto.

---

## 4. Cálculo de indicadores y señales (1D, sobre cierre)

**Medias:** `SMA(n)=mean(close[-n:])`. `EMA(n)`: `k=2/(n+1)`, `EMA_t=close_t*k + EMA_{t-1}*(1-k)`, seed = SMA(n) de las primeras n; warm-up ≥250 barras para EMA200.

**RSI(14) Wilder:** `gain=max(Δclose,0)`, `loss=max(-Δclose,0)`. Primer avg = media simple de 14; luego `avg_t=(avg_{t-1}*13+val_t)/14`. `RS=avgGain/avgLoss`, `RSI=100-100/(1+RS)`. `avgLoss==0 → RSI=100`. (Wilder/RMA, NO SMA, para matchear TradingView.)

**MACD(12,26,9):** `macd=EMA12-EMA26`, `signal=EMA9(macd)`, `hist=macd-signal`.

**CMF(20)** — *proxy de dinero, reemplaza Koncorde*: `MFM=((close-low)-(high-close))/(high-low)` (si `high==low`→0); `MFV=MFM*vol`; `CMF20=sum(MFV,20)/sum(vol,20)`. Rango [-1,+1], centro 0. (Elegido sobre MFI/OBV: acotado, ponderado por volumen, sin solapar con RSI.)

**Score 0–5** (1 pt c/u):
- C1 `aboveAllMAs` = close > SMA30 y > EMA20 y > EMA150 y > EMA200
- C2 `greenCandle` = close > open
- C3 `macdBull` = hist > 0 **y** macd > signal
- C4 `rsiHealthy` = RSI < 65
- C5 `moneyFlowBull` = CMF20 > 0

**Clasificación:**
- `score==5` → **COMPRA FUERTE 🔥**
  - sub-estado: `maxMA=max(4 medias)`. Si `low<=maxMA y close>maxMA` → *"rompiendo la última media"*; si `low>maxMA` → *"sobre las 4 medias"* (consolidado).
- `score==4` → **COMPRA POTENCIAL 📈** (le falta 1): si falla C1 → `% para romper = (maxMA-close)/close*100`; si falla C2 → "falta vela verde"; si C3/C4/C5 → indicar cuál.
- `RSI ∈ [70,75]` → tag **CALIENTE / revisar** (overlay, baja convicción).
- `RSI > 75` → **A REVISAR** y **excluido de compra** aunque sea 5/5 (force-demote).
- `score 0–3` → **SIN SEÑAL**.

**Horizonte:**
- **Corto** (EMA20 & SMA30 + momentum): alcista si close>EMA20 y close>SMA30 y macd>signal y hist≥0; bajista si lo inverso; si no, mixto. Fuerza = slope de hist (`hist_t - hist_{t-1}`).
- **Largo** (EMA150 & EMA200): alcista/"tendencia respetada" si close>EMA150 y close>EMA200 y EMA150>EMA200; bajista si inverso; si no, transición. Banda "respeta la media" = dentro de `EMA*[0.99,1.01]`.

**Throwback-por-media (OUT v1, stub):** por cada MA, `red_candle y low∈[MA*0.99, MA*1.003]`. Feature-flag OFF.

**Guards obligatorios:** div0 en `high==low`, `avgLoss==0`, volumen faltante → NaN rompe el score.

---

## 5. Esquema `signals-latest.json`

```jsonc
{
  "generated_at": "2026-06-07T22:40:00Z",   // para staleness en UI
  "tz": "America/Argentina/Buenos_Aires",
  "market": { "spy_chg": -1.2, "qqq_chg": -0.8 },  // semáforo global header
  "items": [
    {
      "ticker": "NVDA",
      "name": "NVIDIA",
      "exchange": "NASDAQ",
      "country": "US",           // US | AR | BR | CN | GLOBAL
      "sector": "Tecnología",    // ver §6.3 fuente del sector
      "asset_class": "stock",    // stock | index | commodity | crypto
      "defensive": false,        // tag 🛡️
      "is_adr": false,
      "price": 124.3, "chg_pct": 2.1, "currency": "USD",
      "rsi": 58.4,
      "macd": { "line": 1.2, "signal": 0.9, "hist": 0.3, "state": "alcista" },
      "mas": { "sma30": 118, "ema20": 121, "ema150": 110, "ema200": 105,
               "above": { "sma30": true, "ema20": true, "ema150": true, "ema200": true } },
      "cmf": 0.14, "money_flow": "entrada",
      "score": 5,
      "classification": "FUERTE",        // FUERTE | POTENCIAL | A_REVISAR | CALIENTE | SIN_SENAL | SIN_DATOS
      "substate": "sobre_las_4_medias",  // o "rompiendo_ultima_media"
      "missing": null,                   // para POTENCIAL: {criterio, pct_para_romper?}
      "horizon": { "corto": "alcista", "largo": "alcista" },
      "spark": { "price": [...30], "rsi": [...30], "macd_hist": [...30] }, // mini-charts
      "status": "ok"             // ok | sin_datos | sin_volumen | stale
    }
  ]
}
```

---

## 6. UI / UX

### 6.1 Tema (copiar la referencia)
OLED dark: bg `#09090b` (zinc-950), superficie `#18181b`, borde `#27272a`, texto muted `#a1a1aa`, texto `#fafafa`. UI en **español**. Fuente UI Geist/Inter; **todos los números en mono tabular** (Geist Mono / JetBrains Mono, `tabular-nums`) para que no salten al actualizar.

### 6.2 Semáforo (color + ícono, nunca solo color — a11y)
| Estado | Color |
|---|---|
| FUERTE / alcista | verde `#22c55e` |
| POTENCIAL | verde-lima `#84cc16` |
| CALIENTE / neutral | ámbar `#f59e0b` |
| A REVISAR / bajista | rojo `#ef4444` |
| SIN SEÑAL / datos | gris `#52525b` |

### 6.3 Agrupación y filtros — **País × Sector** (requisito clave)
- **Dos ejes ortogonales, ambos como filtro libre:**
  - **País:** 🇺🇸 EEUU · 🇦🇷 Argentina · 🇧🇷 Brasil · 🇨🇳 China · 🌍 Global/ADR · ₿ Cripto
  - **Sector:** Tecnología, Financiero/Bancos, Energía, Materiales, Consumo, Salud, Utilities, Industriales, Comunicaciones…
- **Comportamiento de la vista:**
  - Seleccionás **los dos** → vista **cruzada País × Sector** (agrupada en dos niveles).
  - Seleccionás **uno** → **prioriza ese eje** como agrupación principal.
  - Ninguno → default **País primero, sector como sub-grupo**, con toggle para invertir.
- **Índices / Commodities / Cripto** → bucket propio (no tienen sector real).
- **Defensivas = tag 🛡️** (no grupo): caen solas en Consumo/Salud/Utilities; el tag las distingue en días de rotación.
- **Fuente del sector:** `yfinance.info['sector']` por papel; para argentinos y no-equities, **mapa manual** chico en el repo para que ninguno quede sin clasificar.
- Otros filtros: tipo de señal (Todas/FUERTE/POTENCIAL/A revisar), horizonte (Corto/Largo), rango RSI, "solo señales activas", buscador por ticker. Todo **client-side** sobre el JSON, instantáneo. Estado de filtros/orden persistido en **URL query** (link compartible reproduce la vista).

### 6.4 Listas de seguimiento personalizadas (sin login → localStorage)
- **Favoritos ⭐** por ticker + **listas con nombre** ("Cripto", "Para vigilar"...), guardadas en `localStorage` del navegador.
- Tab "Mis listas" filtra a lo guardado. Export/import JSON opcional para no perderlas.
- **Límite conocido:** atado al navegador/dispositivo (no sincroniza). Sync entre dispositivos = login en v2.

### 6.5 Tabla principal (hero — shadcn Table + TanStack)
Columnas (izq→der): (1) **flag + ticker**; (2) **precio + %día** (verde/rojo, mono); (3) **score** como 5 pips coloreados por tier (tooltip = desglose); (4) **clasificación** Badge (FUERTE🔥/POTENCIAL📈/A REVISAR/sin señal); (5) **RSI** nº + dot por banda (<65 verde, 65–70 amarillo, 70–75 naranja, >75 rojo); (6) **MACD** pill (alcista↑/bajista↓/cruce↑/plano); (7) **MAs** = 4 barritas verticales (verde si precio>MA, rojo si <) — un glyph compacto ~24px; (8) **Flujo** flecha ▲/▼ por CMF (entrada/salida + intensidad).
Orden default: **Score desc → %día desc**. Ordenables: Score, Precio, %, RSI. Header sticky con blur.

### 6.6 Detalle (shadcn Sheet, drawer derecha ~480px / bottom en mobile)
Header (flag+ticker, precio+%, badge, pips) + **3 sparklines** (precio 30d área; RSI con guías 30/70; MACD histograma+señal) + lista key/value de valores crudos (RSI, MACD, dist% a cada MA, vol vs media). Sin botones de trade.

### 6.7 Estados
- **Stale:** timestamp "Actualizado hace Xm" → ámbar >15min, rojo >60min + banner dismissible + números con `opacity-70` y ícono reloj.
- **Vacío:** centrado por tab — "Sin señales en este mercado ahora mismo".
- **Loading:** skeleton rows.
- **sin_datos:** fila en gris con "—" y nota, no número engañoso.

### 6.8 Mobile (<768px)
Tabla → **Card** por ticker (fila1 flag+ticker+precio%; fila2 pips+badge; fila3 RSI·MACD·MAs·Flujo). Tabs = pills scroll horizontal. Filtros colapsados en un Sheet "Filtros". Tap = mismo drawer (bottom sheet).

### 6.9 Componentes shadcn
Table+TanStack, Badge, Tabs, ToggleGroup, Switch, Input(search), Tooltip(+Provider root), Sheet, Card, Skeleton, Alert/Sonner (stale), Chart (Recharts) para sparklines, DropdownMenu (orden/visibilidad), ScrollArea. Con muchos papeles: TanStack Virtual.

### 6.10 Legal
Disclaimer persistente en footer: **"Análisis técnico automatizado. No es recomendación de inversión."**

---

## 7. Stack y deploy

- **Front:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, deploy en **Vercel** (Hobby). Lee R2 con ISR.
- **Job datos:** Python (yfinance + `curl_cffi` + pandas/numpy + boto3) en **GitHub Actions** (repo público), cron diario, escribe a **Cloudflare R2**.
- **Secrets (GitHub Actions):** `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`.
- **Se actualiza solo:** cron corre → JSON nuevo en R2 → ISR de Vercel revalida (~1h) o `revalidateTag` on-demand desde el job para cero lag. Cero intervención diaria.

---

## 8. Riesgos y mitigaciones (de la verificación adversarial)

| Riesgo | Mitigación |
|---|---|
| **Yahoo bloquea IP de datacenter (GH Actions)** — el más probable | `curl_cffi` impersonate + bulk + backoff + **cache last-good** (degrada a stale). Escape hatch: proxy residencial (centavos). |
| data912 `/historical` viejo (2017) | usar solo `/live` para last-price; EMA200 se siembra de Yahoo. |
| yfinance falso "possibly delisted" / volumen 0 | validar ≥200 cierres no nulos; marcar `sin_datos`; no graficar números engañosos. |
| GH cron drift/drops | buffer 20–30 min, minuto impar, retry; día perdido = dato de ayer (ISR lo banca). |
| Actuar sobre dato viejo | banner stale obligatorio + números atenuados + disclaimer. |
| RSI distinto si no es Wilder | fijar suavizado Wilder/RMA (matchea TradingView). |
| Color-only (daltonismo ~8%) | siempre color + ícono/forma/texto. |

---

## 9. Roadmap de implementación

1. **Job de datos (núcleo del valor)** — fetch yfinance bulk + curl_cffi para un set chico (10 papeles mixtos US+BCBA), calcular todos los indicadores + score, validar contra TradingView, escribir JSON local. *Sin esto nada sirve.*
2. **Universo completo + validación** — los ~190 con dedup ADR/local, mapa de sectores, reglas `sin_datos`, cache last-good.
3. **Infra cloud** — R2 bucket + GitHub Actions cron + secrets; primer JSON publicado y servido.
4. **Front base** — Next.js + shadcn, leer JSON de R2 con ISR, tabla densa con semáforo (sin filtros aún).
5. **Filtros + agrupación País×Sector** + estados stale/empty/loading.
6. **Drawer detalle + sparklines.**
7. **Listas personalizadas (localStorage) + favoritos + URL state.**
8. **Mobile cards + pulido + disclaimer + deploy público.**

> v2 candidatos: login + sync de listas, throwback-por-media, alertas, intradía, multi-timeframe.
