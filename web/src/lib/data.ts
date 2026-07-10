import { readFile } from "fs/promises";
import path from "path";
import type { SignalsPayload } from "./types";

/**
 * Carga las señales.
 * - Prod: si existe SIGNALS_URL (bucket Cloudflare R2), la fetchea con ISR.
 * - Dev/fallback: lee el JSON local en web/public/data/signals-latest.json.
 */
export async function loadSignals(): Promise<SignalsPayload> {
  const url = process.env.SIGNALS_URL;
  if (url) {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`SIGNALS_URL ${res.status}`);
    return res.json();
  }
  const file = path.join(process.cwd(), "public", "data", "signals-latest.json");
  const raw = await readFile(file, "utf-8");
  return JSON.parse(raw) as SignalsPayload;
}

export const revalidate = 3600;
