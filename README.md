# Panel de Análisis de Mercado

Dashboard web público de señales técnicas (RSI, MACD, medias móviles) sobre ~190 papeles
(EEUU, ADRs argentinos, BCBA, Brasil, China, índices, commodities, cripto).
Autónomo, gratis, se actualiza solo. Informativo — no ejecuta órdenes.

Spec completo: [`docs/2026-06-07-panel-mercado-spec.md`](docs/2026-06-07-panel-mercado-spec.md)

## Estructura

```
data-pipeline/        # job Python: baja OHLCV, calcula indicadores, escribe signals-latest.json
  universe.py         #   ~186 papeles con país/sector/dedup ADR
  indicators.py       #   SMA/EMA/RSI(Wilder)/MACD/CMF + score 0-5 + clasificación
  fetch.py            #   yfinance + curl_cffi (anti-bloqueo: lote + reintentos)
  build_signals.py    #   orquesta -> output/signals-latest.json
  upload_r2.py        #   sube el JSON a Cloudflare R2
web/                  # dashboard Next.js 16 + Tailwind v4 (lee el JSON, lo muestra)
.github/workflows/    # cron diario que corre el pipeline y sube a R2
```

## Correr local

```bash
# 1) datos
cd data-pipeline
pip install -r requirements.txt
python build_signals.py                 # genera output/signals-latest.json
cp output/signals-latest.json ../web/public/data/   # semilla para el front

# 2) web
cd ../web
npm install
npm run dev                             # http://localhost:3000
```

El front lee de `SIGNALS_URL` (R2) si está seteada; si no, del JSON local en `web/public/data/`.

## Deploy (todo free tier)

1. **GitHub** (repo público → Actions ilimitadas).
2. **Cloudflare R2**: crear bucket público; cargar secrets en GitHub Actions:
   `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
3. **Vercel**: importar el repo (root = `web/`), env `SIGNALS_URL` = URL pública del JSON en R2.
4. El cron (`.github/workflows/build-signals.yml`) corre solo cada día hábil 22:30 UTC.

### Riesgo conocido
Los runners de GitHub son IPs de datacenter y Yahoo puede throttlearlas. El código mitiga
(curl_cffi + lote + reintentos + health gate; si falla, queda el último JSON bueno en R2).
Si se vuelve crónico: proxy residencial (centavos) o self-hosted runner.

> Análisis técnico automatizado. No es recomendación de inversión.
