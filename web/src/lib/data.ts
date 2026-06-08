import { readFile } from "fs/promises";
import path from "path";
import type { SignalsPayload, Fundamentals } from "./types";

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

export async function loadFundamentals(): Promise<Fundamentals> {
  const url = process.env.FUNDAMENTALS_URL;
  try {
    if (url) {
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (res.ok) return res.json();
    }
    const file = path.join(process.cwd(), "public", "data", "fundamentals-latest.json");
    return JSON.parse(await readFile(file, "utf-8")) as Fundamentals;
  } catch {
    return {};
  }
}

export const revalidate = 3600;
