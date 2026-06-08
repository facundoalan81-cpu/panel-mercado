import type { Classification, Country, Signal } from "./types";

export const CLASS_META: Record<
  Classification,
  { label: string; emoji: string; badge: string; rank: number }
> = {
  FUERTE: { label: "Alcista", emoji: "", badge: "bg-green-500/15 text-green-400 border-green-500/30", rank: 0 },
  POTENCIAL: { label: "Alcista parcial", emoji: "", badge: "bg-lime-500/15 text-lime-400 border-lime-500/30", rank: 1 },
  CALIENTE: { label: "Caliente", emoji: "", badge: "bg-amber-500/15 text-amber-400 border-amber-500/30", rank: 2 },
  A_REVISAR: { label: "Sobrecomprado", emoji: "", badge: "bg-amber-500/15 text-amber-400 border-amber-500/30", rank: 3 },
  SIN_SENAL: { label: "Neutral", emoji: "", badge: "bg-zinc-500/10 text-zinc-400 border-zinc-700/50", rank: 4 },
  SIN_DATOS: { label: "Sin datos", emoji: "", badge: "bg-zinc-500/10 text-zinc-600 border-zinc-800", rank: 5 },
};

export const COUNTRY_META: Record<Country, { flag: string; label: string }> = {
  US: { flag: "🇺🇸", label: "EEUU" },
  AR: { flag: "🇦🇷", label: "Argentina" },
  BR: { flag: "🇧🇷", label: "Brasil" },
  CN: { flag: "🇨🇳", label: "China" },
  GLOBAL: { flag: "🌍", label: "Global" },
};

export function flagFor(s: { country: Country; asset_class: string }): string {
  if (s.asset_class === "crypto") return "₿";
  if (s.asset_class === "commodity") return "🛢️";
  if (s.asset_class === "index") return "🌍";
  return COUNTRY_META[s.country]?.flag ?? "🌍";
}

export function fmtPrice(n?: number | null, currency?: string): string {
  if (n == null) return "—";
  const dec = n >= 1000 ? 0 : n >= 1 ? 2 : 4;
  return n.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtPct(n?: number | null): string {
  if (n == null) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

// Veredicto direccional simple a partir del puntaje de confluencia (0-100):
// claro y accionable — compra o venta, con intensidad. Sin "neutral" vago.
export function verdict(score?: number | null): { label: string; cls: string; icon: string } {
  const v = score ?? 50;
  if (v >= 68) return { label: "Compra fuerte", cls: "bg-green-500/15 text-green-400 border-green-500/40", icon: "arrowUp" };
  if (v >= 50) return { label: "Compra", cls: "bg-green-500/10 text-green-300 border-green-500/25", icon: "arrowUp" };
  if (v >= 32) return { label: "Venta", cls: "bg-red-500/10 text-red-300 border-red-500/25", icon: "arrowDown" };
  return { label: "Venta fuerte", cls: "bg-red-500/15 text-red-400 border-red-500/40", icon: "arrowDown" };
}

export function rsiColor(rsi?: number): string {
  if (rsi == null) return "text-zinc-500";
  if (rsi > 75) return "text-red-400";
  if (rsi > 70) return "text-amber-400";
  if (rsi >= 65) return "text-yellow-400";
  return "text-green-400";
}

// Lectura técnica neutral (analítica, describe el estado — no es una recomendación de compra)
export function signalHint(s: Signal): string {
  if (s.classification === "SIN_DATOS") return "Sin datos suficientes";
  if (s.classification === "A_REVISAR") return "RSI sobrecomprado (>75) — zona de cautela";
  if (s.classification === "FUERTE")
    return s.substate === "rompiendo_ultima_media"
      ? "Recién cruzó las 4 medias, MACD alcista"
      : "Sobre las 4 medias, MACD alcista, volumen entrando";
  if (s.classification === "POTENCIAL") {
    const c = s.missing?.criterio;
    if (c === "above_all_mas") return `MACD alcista; a ${s.missing?.pct_para_romper ?? ""}% de subirse a la última media`;
    if (c === "green_candle") return "Sobre las medias y MACD alcista; vela del día aún roja";
    if (c === "macd_bull") return "Sobre las medias; MACD todavía sin confirmar";
    if (c === "rsi_healthy") return "Alineada, pero RSI algo alto";
    if (c === "money_flow_bull") return "Alineada; sin volumen comprador todavía";
    return "Casi alineada técnicamente";
  }
  if (s.caliente) return "RSI alto (70-75) — atención";
  return "Sin alineación técnica clara";
}

// Explicaciones en castellano para tooltips (enseñar al usuario)
export const HELP: Record<string, string> = {
  precio: "Precio actual y cuánto cambió hoy (verde sube, rojo baja).",
  trend7d: "Mini-gráfico de cómo se movió el precio los últimos días.",
  senal: "Lectura técnica: postura del papel según medias, MACD, RSI y volumen. Es análisis, no una recomendación de compra.",
  score: "Cuántos de los 5 criterios técnicos están alineados (sobre las medias, vela verde, MACD, RSI sano, volumen).",
  rsi: "RSI: mide si está cara o barata. Arriba de 70 = sobrecomprada (cara), abajo de 30 = sobrevendida (barata). Sano para comprar: menos de 65.",
  avwap: "AVWAP: precio promedio ponderado por volumen desde inicio de año. % = qué tan lejos está el precio de ese promedio.",
  rsihist: "RSI Hist: impulso del RSI (si viene acelerando o frenando). Positivo = ganando fuerza.",
  macd: "MACD: mide el impulso del precio. Alcista = el movimiento empuja para arriba.",
  emas: "Medias móviles: precio por encima = tendencia sana. Las cortas (7-42) miran el corto plazo; las largas (100/200) el largo plazo.",
  supertrend: "SuperTrend: marca la tendencia actual. Up = mandan los compradores; Down = los vendedores.",
  wavetrend: "WaveTrend: oscilador de impulso. Ayuda a ver sobrecompra/sobreventa.",
  bbp: "Bull/Bear Power: quién domina, compradores (Bull) o vendedores (Bear).",
  volumen: "Volumen operado del día y cuántas veces el promedio (1.5× = mucho interés).",
  flujo: "Flujo de dinero: si está entrando plata (compradores) o saliendo (vendedores).",
  corto: "Corto plazo (días/semanas): se fija en las medias rápidas y el impulso.",
  largo: "Largo plazo (meses): se fija en que respete las medias largas (150/200).",
};

export function horizonLabel(h?: string): { txt: string; col: string } {
  if (h === "alcista") return { txt: "Alcista", col: "text-green-400" };
  if (h === "bajista") return { txt: "Bajista", col: "text-red-400" };
  if (h === "transicion") return { txt: "Transición", col: "text-amber-400" };
  return { txt: "Mixto", col: "text-zinc-400" };
}

export const SECTOR_ORDER = [
  "Tecnología", "Comunicaciones", "Consumo Discrecional", "Consumo Básico",
  "Salud", "Financiero", "Energía", "Materiales", "Industriales",
  "Utilities", "Inmobiliario", "Índices", "Commodities", "Cripto",
];
