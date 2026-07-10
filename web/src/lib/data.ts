import { readFile } from "fs/promises";
import path from "path";
import type { SignalsPayload } from "./types";

// Las señales viven en el repo de DATOS (branch data-signals), servidas por raw GitHub.
// Vercel las revalida por ISR cada 15 min SIN redeploy (los datos nunca tocan main).
const SIGNALS_URL =
  process.env.SIGNALS_URL ||
  "https://raw.githubusercontent.com/facundoalan81-cpu/panel-mercado-data/data-signals/signals-latest.json";

/**
 * Carga las señales.
 * - Prod: fetchea SIGNALS_URL (raw GitHub) con ISR de 15 min.
 * - Dev / raw caído: cae al JSON local en web/public/data/signals-latest.json.
 */
export async function loadSignals(): Promise<SignalsPayload> {
  try {
    const res = await fetch(SIGNALS_URL, { next: { revalidate: 900 } });
    if (res.ok) return (await res.json()) as SignalsPayload;
  } catch {
    /* raw caído -> cae al archivo local */
  }
  const file = path.join(process.cwd(), "public", "data", "signals-latest.json");
  return JSON.parse(await readFile(file, "utf-8")) as SignalsPayload;
}

export const revalidate = 900;
