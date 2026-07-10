# resumen-es.json — resúmenes de empresa en español

`{ticker: "qué hace en 1-2 líneas, castellano claro, sin marketing ni promesas de inversión"}`.

El front (modo Análisis y detalle) usa este archivo y cae al `summary` en inglés de
`fundamentals-latest.json` solo si el ticker falta acá. Es decir: falta un resumen ES → se ve
el inglés (factual), nunca queda vacío.

## Cobertura actual
Los 64 papeles **curados** del universo (mega-caps US, todos los ADR argentinos, Brasil, China y
las altas recientes: ASTS/IREN/LAC/SATL/KEEL). Son los que el grupo efectivamente discute. La cola
larga del S&P 500 (nombres poco hablados) cae al summary inglés hasta que se traduzcan.

## Cómo extender (incremental — NO regenerar todo)
1. Sacar los tickers sin resumen ES:
   ```
   python3 - <<'PY'
   import json
   funds = json.load(open("fundamentals-latest.json"))
   es = json.load(open("resumen-es.json"))
   faltan = [t for t in funds if not t.startswith("_") and t not in es and funds[t].get("summary")]
   print(len(faltan), "faltan"); print(" ".join(faltan))
   PY
   ```
2. Traducir/condensar el `summary` inglés de cada uno a 1-2 líneas en castellano (tono del grupo,
   sin promesas). Agregarlos a `resumen-es.json` SIN tocar los existentes.
3. Commit. El front los toma solo (fetch same-origin, sin rebuild del pipeline).
