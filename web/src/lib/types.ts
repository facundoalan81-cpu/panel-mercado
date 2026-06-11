export type Country = "US" | "AR" | "BR" | "CN" | "GLOBAL";
export type AssetClass = "stock" | "index" | "commodity" | "crypto";
export type Classification =
  | "FUERTE"
  | "POTENCIAL"
  | "A_REVISAR"
  | "CALIENTE"
  | "SIN_SENAL"
  | "SIN_DATOS";

export interface MAs {
  sma30: number;
  ema20: number;
  ema150: number;
  ema200: number;
  above: { sma30: boolean; ema20: boolean; ema150: boolean; ema200: boolean };
}

export interface Macd {
  line: number;
  signal: number;
  hist: number;
  state: "alcista" | "bajista" | "plano";
}

export interface Spark {
  price: (number | null)[];
  rsi: (number | null)[];
  macd_hist: (number | null)[];
}

export interface Ohlc {
  open: number | null;
  high: number | null;
  low: number | null;
  prev_close: number | null;
  volume: number | null;
}

export interface Signal {
  ticker: string;
  name: string;
  exchange: string;
  tv: string;
  country: Country;
  sector: string;
  asset_class: AssetClass;
  defensive: boolean;
  is_adr: boolean;
  ar_panel?: "lider" | "general" | null;
  currency: string;
  ohlc?: Ohlc;
  status: "ok" | "sin_datos";
  bars: number;
  price?: number;
  chg_pct?: number | null;
  rsi?: number;
  macd?: Macd;
  mas?: MAs;
  cmf?: number | null;
  money_flow?: "entrada" | "salida" | "neutro" | "N/A";
  bias?: { label: string; score: number; text: string };
  atr?: { value: number; pct: number; stop: number } | null;
  tesis?: { pros: string[]; cons: string[]; invalida: { ref: string; nivel: number; pct: number } | null } | null;
  rs?: { m1: number | null; m3: number | null } | null;
  emas?: {
    e7: number | null; e14: number | null; e21: number | null;
    e42: number | null; e100: number | null; e200: number | null;
    above: { e7: boolean | null; e14: boolean | null; e21: boolean | null; e42: boolean | null; e100: boolean | null; e200: boolean | null };
  };
  supertrend?: { value: number | null; dir: "up" | "down" | null };
  wavetrend?: { wt1: number | null; wt2: number | null; dir: "up" | "down" | null };
  bbp?: { value: number | null; state: "bull" | "bear" | null };
  vol?: { value: number | null; rel: number | null };
  avwap?: { value: number | null; pct: number | null };
  rsi_hist?: number | null;
  criteria?: Record<string, boolean>;
  score?: number | null;
  classification: Classification;
  substate?: string | null;
  missing?: { criterio: string; pct_para_romper?: number } | null;
  caliente?: boolean;
  horizon?: { corto: string; largo: string };
  spark?: Spark;
  tf?: Record<string, Partial<Signal>>;
}

export interface Fng {
  value: number;
  history: { d: string; v: number }[];
  prev: { close: number | null; week: number | null; month: number | null; year: number | null };
}

export interface SignalsPayload {
  generated_at: string;
  tz: string;
  market: { spy_chg: number | null; qqq_chg: number | null; pct_above_ema200?: number | null };
  fng?: Fng;
  count: number;
  items: Signal[];
}

export interface Fundamental {
  name: string;
  sector: string | null;
  industry: string | null;
  website: string | null;
  summary: string | null;
  market_cap: number | null;
  currency: string | null;
  gross_margin: number | null;
  op_margin: number | null;
  profit_margin: number | null;
  fcf_margin: number | null;
  ev_ebitda: number | null;
  pe: number | null;
  fwd_pe: number | null;
  roe: number | null;
  rev_growth: number | null;
  annual_return: number | null;
  revenue: Record<string, number>;
  fcf: Record<string, number>;
  shares: Record<string, number>;
}

export type Fundamentals = Record<string, Fundamental>;
