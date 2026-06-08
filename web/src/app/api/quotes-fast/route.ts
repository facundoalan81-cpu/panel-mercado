// Proxy de cotizaciones RÁPIDAS (~1 min).
// Lee quotes-fast.json del branch `data-fast` vía la API de GitHub (media type raw), que NO pasa
// por el CDN de raw.githubusercontent (ese cachea 5 min e ignora el cache-bust).
// Cache de borde corto en Vercel (s-maxage) -> el cliente lo pega a 60s y ve datos de ~1 min.
// Si la API falla o rate-limitea, cae a raw (hasta ~5 min, pero nunca rompe).

const REPO = "facundoalan81-cpu/panel-mercado";
const API = `https://api.github.com/repos/${REPO}/contents/quotes-fast.json?ref=data-fast`;
const RAW = `https://raw.githubusercontent.com/${REPO}/data-fast/quotes-fast.json`;

export async function GET() {
  let body: string | null = null;

  try {
    const r = await fetch(API, {
      headers: { Accept: "application/vnd.github.raw+json", "User-Agent": "panel-mercado" },
      cache: "no-store",
    });
    if (r.ok) body = await r.text();
  } catch { /* sigue al fallback */ }

  if (!body) {
    try {
      const r = await fetch(RAW, { cache: "no-store" });
      if (r.ok) body = await r.text();
    } catch { /* devolvemos vacío */ }
  }

  if (!body) {
    return new Response(JSON.stringify({ t: null, q: {} }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
