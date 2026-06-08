# Deploy — Panel de Mercado (gratis, autónomo)

Arquitectura final (sin Cloudflare): **GitHub (repo público) + GitHub Actions (datos) + Vercel (web)**.
- El Action corre el pipeline Python todas las noches (días hábiles), recalcula el JSON y lo **commitea al repo**.
- Vercel sirve la app Next y la revalida cada 1 h. No hace falta R2 ni variables de entorno.
- Todo en free tier. Repo público = minutos de Actions ilimitados.

## Lo que YA está listo (verificado)
- App compila en producción (601 papeles). Home estática con ISR (revalida 1 h).
- `next.config.ts` incluye el JSON en el trace del server (Vercel lo lee aunque no se configure nada).
- `.github/workflows/build-signals.yml`: corre el pipeline y commitea `web/public/data/signals-latest.json`.
- `data-pipeline/requirements.txt` con todas las deps.

## Pasos (necesitan tus cuentas — los hacemos juntos)

### 1. GitHub
1. Crear cuenta en github.com (si no tenés) y loguear el CLI: `gh auth login`.
2. Desde la carpeta del proyecto:
   ```
   cd ~/Documents/Claude/Projects/panel-mercado
   git init && git add -A && git commit -m "Panel de Mercado v1"
   gh repo create panel-mercado --public --source=. --push
   ```
   (Repo **público** = Actions gratis ilimitado.)

### 2. Vercel
1. Entrar a vercel.com → **Log in with GitHub** (autoriza con tu cuenta).
2. **Add New → Project** → importar el repo `panel-mercado`.
3. **IMPORTANTE — Root Directory:** poner `web` (la app vive en esa subcarpeta).
4. Framework: Next.js (lo detecta solo). Deploy. En ~1 min queda el link público.

### 3. Listo
- El link de Vercel (algo tipo `panel-mercado.vercel.app`) es el que le pasás al grupo.
- El Action corre solo de noche y actualiza los datos; Vercel redeploya solo en cada push.
- Para correrlo a mano: pestaña **Actions → build-signals → Run workflow**.

## Notas
- **Riesgo conocido:** los runners de GitHub usan IPs de datacenter; Yahoo a veces las throttlea. El código ya mitiga (curl_cffi + lotes + reintentos + health gate >50%). Si se vuelve crónico: self-hosted runner en tu Mac o proxy residencial.
- **Fundamentals** (modo análisis) hoy cubre el set original; los nombres nuevos del S&P se completan cuando agreguemos un job semanal de fundamentals.
- `data-pipeline/upload_r2.py` quedó sin uso (era para R2). Se puede borrar.
