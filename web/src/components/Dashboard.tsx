"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import type { Signal, SignalsPayload, Fundamentals } from "@/lib/types";
import { CLASS_META, COUNTRY_META, SECTOR_ORDER, HELP, fmtPrice, fmtPct } from "@/lib/format";
import { BiasBadge, ScorePips, RsiCell, MacdPill, MAsGlyph, VolFlowCell, Flag, EmaPair, SuperTrendCell, WaveTrendCell, BbpCell, VolCell, AvwapCell, RsiHistCell } from "./bits";
import { Icon } from "./Icons";
import { Tip } from "./Tooltip";
import { Logo } from "./Logo";
import { LineSpark } from "./Sparkline";
import { DetailDrawer, DetailContent } from "./DetailDrawer";
import { AnalysisMode } from "./AnalysisMode";
import { MarketPanel } from "./MarketPanel";
import { SimpleTable } from "./SimpleTable";
import { Heatmap } from "./Heatmap";

const FAVS_KEY = "pm-favs";
type GroupBy = "pais" | "sector" | "ambos" | "lista";
type Sort = { key: string; dir: "asc" | "desc" };

const TABS: { id: string; label: string; fn: (s: Signal) => boolean }[] = [
  { id: "todos", label: "Todos", fn: () => true },
  { id: "ws", label: "Wall Street", fn: (s) => s.country === "US" && !s.defensive && s.asset_class === "stock" },
  { id: "cripto", label: "Cripto", fn: (s) => s.asset_class === "crypto" },
  { id: "adr", label: "ADR", fn: (s) => s.country === "AR" && s.is_adr },
  { id: "arg", label: "Argentina", fn: (s) => s.country === "AR" && !s.is_adr },
  { id: "br", label: "Brasil", fn: (s) => s.country === "BR" },
  { id: "cn", label: "China", fn: (s) => s.country === "CN" },
  { id: "def", label: "Defensivas", fn: (s) => s.defensive },
  { id: "indices", label: "Índices", fn: (s) => s.asset_class === "index" || s.asset_class === "commodity" },
  { id: "heatmap", label: "Heatmap", fn: () => true },
];

const SORT_VAL: Record<string, (s: Signal) => number> = {
  price: (s) => s.price ?? -Infinity,
  chg: (s) => s.chg_pct ?? -Infinity,
  score: (s) => s.score ?? -1,
  rsi: (s) => s.rsi ?? -1,
  vol: (s) => s.vol?.value ?? -1,
};

function useFavorites() {
  const { isSignedIn, user } = useUser();
  const [favs, setFavs] = useState<Set<string>>(new Set());

  // Carga: logueado -> de la cuenta (sincronizado entre dispositivos); si no -> localStorage.
  useEffect(() => {
    if (isSignedIn && user) {
      const remote = (user.unsafeMetadata?.favs as string[] | undefined) ?? [];
      let local: string[] = [];
      try { local = JSON.parse(localStorage.getItem(FAVS_KEY) || "[]"); } catch {}
      const merged = [...new Set([...remote, ...local])];
      setFavs(new Set(merged));
      // al loguearse, sube lo que tenía en el navegador y no estaba en la cuenta
      if (merged.length !== remote.length) {
        user.update({ unsafeMetadata: { ...(user.unsafeMetadata as Record<string, unknown>), favs: merged } }).catch(() => {});
      }
    } else {
      try { setFavs(new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || "[]"))); } catch {}
    }
  }, [isSignedIn, user]);

  const toggle = (t: string) => setFavs((p) => {
    const n = new Set(p); if (n.has(t)) n.delete(t); else n.add(t);
    const arr = [...n];
    try { localStorage.setItem(FAVS_KEY, JSON.stringify(arr)); } catch {}
    if (isSignedIn && user) user.update({ unsafeMetadata: { ...(user.unsafeMetadata as Record<string, unknown>), favs: arr } }).catch(() => {});
    return n;
  });
  return { favs, toggle };
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors duration-200 ${on ? "border-zinc-500 bg-zinc-800 text-zinc-100" : "border-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>{children}</button>;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors duration-200 ${on ? "border-zinc-400 bg-zinc-200 font-medium text-zinc-900" : "border-zinc-700/70 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"}`}>{children}</button>;
}

export default function Dashboard({ data, funds }: { data: SignalsPayload; funds: Fundamentals }) {
  const { favs, toggle } = useFavorites();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [tab, setTab] = useState("todos");
  const [countries, setCountries] = useState<Set<string>>(new Set());
  const [sectors, setSectors] = useState<Set<string>>(new Set());
  const [klass, setKlass] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [onlySignals, setOnlySignals] = useState(false);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("pais");
  const [view, setView] = useState<"simple" | "pro">("simple");
  const [tf, setTf] = useState("1d");
  const [sort, setSort] = useState<Sort | null>(null);
  const [selected, setSelected] = useState<Signal | null>(null);
  const [detailWide, setDetailWide] = useState(false);
  const [clock, setClock] = useState("");
  type Quotes = { t: string; q: Record<string, { p: number; c: number | null }> };
  const [live, setLive] = useState<Quotes | null>(null);        // carril completo (~5 min, 614 papeles)
  const [liveFast, setLiveFast] = useState<Quotes | null>(null); // carril rápido (~1 min, ~150 calientes)

  useEffect(() => { const tick = () => setClock(new Date().toLocaleTimeString("es-AR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })); tick(); const id = setInterval(tick, 1000); return () => clearInterval(id); }, []);

  // Carril COMPLETO: branch `data` por raw GitHub (CORS abierto) cada 60s. Cubre los 614 papeles (~5 min).
  useEffect(() => {
    let alive = true;
    const url = "https://raw.githubusercontent.com/facundoalan81-cpu/panel-mercado-data/data/quotes-latest.json";
    const pull = async () => {
      try {
        const r = await fetch(`${url}?t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" });
        if (r.ok && alive) setLive(await r.json());
      } catch { /* sin live: cae a los precios del JSON */ }
    };
    pull();
    const id = setInterval(pull, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Carril RÁPIDO: proxy propio /api/quotes-fast (esquiva el cache de raw) cada 45s. Solo papeles calientes (~1 min).
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch("/api/quotes-fast", { cache: "no-store" });
        if (r.ok && alive) { const j = await r.json(); if (j?.t) setLiveFast(j); }
      } catch { /* sin fast: queda el carril completo */ }
    };
    pull();
    const id = setInterval(pull, 45000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Mapa de precios efectivo: el rápido pisa al completo para los papeles que cubre.
  const liveQ = useMemo(() => ({ ...(live?.q ?? {}), ...(liveFast?.q ?? {}) }), [live, liveFast]);

  // viewItems = ítems con los INDICADORES del timeframe elegido.
  // El precio y la variación son SIEMPRE los actuales (no cambian por el marco); solo cambian los indicadores.
  const viewItems = useMemo(() => {
    const META = ["ticker", "name", "exchange", "tv", "country", "sector", "asset_class", "defensive", "is_adr", "ar_panel", "currency"] as const;
    const base = tf === "1d" ? data.items : data.items.map((it) => {
      const meta = Object.fromEntries(META.map((k) => [k, it[k as keyof Signal]]));
      const e = it.tf?.[tf];
      return {
        ...(meta as object),
        ...(e ?? { status: "sin_datos", classification: "SIN_DATOS", score: null }),
        price: it.price, chg_pct: it.chg_pct, spark: it.spark, ohlc: it.ohlc,
      } as Signal;
    });
    // precio/% EN VIVO sobreescriben los del JSON (los indicadores quedan del último pipeline)
    if (!Object.keys(liveQ).length) return base;
    return base.map((s) => {
      const lq = liveQ[s.ticker];
      return lq && lq.p != null ? { ...s, price: lq.p, chg_pct: lq.c } : s;
    });
  }, [data.items, tf, liveQ]);

  const byTicker = useMemo(() => new Map(viewItems.map((s) => [s.ticker, s])), [viewItems]);
  const dailyByTicker = useMemo(() => new Map(data.items.map((s) => [s.ticker, s])), [data.items]);
  const tabFn = TABS.find((t) => t.id === tab)?.fn ?? (() => true);
  const presentSectors = useMemo(() => SECTOR_ORDER.filter((s) => data.items.some((it) => it.sector === s)), [data.items]);
  const presentCountries = useMemo(() => (["AR", "US", "BR", "CN", "GLOBAL"] as const).filter((c) => data.items.some((it) => it.country === c)), [data.items]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return viewItems.filter((s) => {
      if (!tabFn(s)) return false;
      if (countries.size && !countries.has(s.country)) return false;
      if (sectors.size && !sectors.has(s.sector)) return false;
      if (klass.size && !klass.has(s.classification)) return false;
      if (onlyFavs && !favs.has(s.ticker)) return false;
      if (onlySignals && (s.classification === "SIN_SENAL" || s.classification === "SIN_DATOS")) return false;
      if (q && !(s.ticker.includes(q) || s.name.toUpperCase().includes(q))) return false;
      return true;
    });
  }, [viewItems, tabFn, countries, sectors, klass, onlyFavs, onlySignals, search, favs]);

  const sortRows = (rows: Signal[]) => {
    if (sort) {
      const f = SORT_VAL[sort.key];
      return [...rows].sort((a, b) => (sort.dir === "asc" ? f(a) - f(b) : f(b) - f(a)));
    }
    // Orden por defecto ESTABLE: se ancla al ranking del DIARIO, no al marco elegido
    // -> las filas no saltan al cambiar de marco (solo cambian los indicadores de cada celda).
    const key = (s: Signal) => {
      const d = dailyByTicker.get(s.ticker) ?? s;
      return CLASS_META[d.classification].rank * 1e6 - (d.score ?? -1) * 1e3 - (d.chg_pct ?? -99);
    };
    return [...rows].sort((a, b) => key(a) - key(b));
  };

  const groups = useMemo(() => {
    const keyOf = (s: Signal) => {
      const c = COUNTRY_META[s.country]?.label ?? s.country;
      if (groupBy === "sector") return s.sector;
      if (groupBy === "ambos") return `${c} · ${s.sector}`;
      if (groupBy === "lista") return "Todos";
      // pais: Argentina se parte en Panel Líder / Panel General (como los brokers)
      if (s.country === "AR") return `Argentina · Panel ${s.ar_panel === "general" ? "General" : "Líder"}`;
      return c;
    };
    const map = new Map<string, Signal[]>();
    for (const s of filtered) { const k = keyOf(s); if (!map.has(k)) map.set(k, []); map.get(k)!.push(s); }
    const ci = (l: string) => ["Argentina", "EEUU", "Brasil", "China", "Global"].indexOf(l);
    const ord = (k: string) => {
      if (groupBy === "sector") return SECTOR_ORDER.indexOf(k);
      const parts = k.split(" · ");
      const base = ci(parts[0]) * 100;
      if (groupBy === "pais") return base + (parts[1] === "Panel General" ? 1 : 0);
      return base + Math.max(0, SECTOR_ORDER.indexOf(parts[1] || ""));
    };
    return [...map.entries()].sort((a, b) => ord(a[0]) - ord(b[0])).map(([k, rows]) => [k, sortRows(rows)] as const);
  }, [filtered, groupBy, sort, dailyByTicker]);

  const tally = useMemo(() => { const c = (k: string) => viewItems.filter((s) => s.classification === k).length; return { fuerte: c("FUERTE"), potencial: c("POTENCIAL"), revisar: c("A_REVISAR") }; }, [viewItems]);
  const updated = useMemo(() => { const d = new Date(data.generated_at); const h = (Date.now() - d.getTime()) / 36e5; return { rel: h < 1 ? "recién" : h < 36 ? `hace ${Math.round(h)} h` : `hace ${Math.round(h / 24)} d`, stale: h > 48, label: d.toLocaleString("es-AR") }; }, [data.generated_at]);
  const liveAge = useMemo(() => {
    void clock; // re-evalúa cada segundo para refrescar el "hace X"
    const ts = [liveFast?.t, live?.t].filter(Boolean).map((t) => new Date(t as string).getTime());
    if (!ts.length) return null;
    const newest = Math.max(...ts);
    const sec = (Date.now() - newest) / 1000;
    const txt = sec < 90 ? "recién" : sec < 3600 ? `hace ${Math.round(sec / 60)} min` : `hace ${Math.round(sec / 3600)} h`;
    return { txt, fresh: sec < 15 * 60, label: new Date(newest).toLocaleString("es-AR") };
  }, [live, liveFast, clock]);
  const freshChip = liveAge ? liveAge.fresh : !updated.stale;

  const toggleSort = (key: string) => setSort((p) => (p?.key === key ? (p.dir === "desc" ? { key, dir: "asc" } : null) : { key, dir: "desc" }));

  return (
    <div className="min-h-full">
      {/* BANNER de marca */}
      <div className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-r from-violet-600/25 via-fuchsia-600/10 to-transparent">
        <div className="pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="flex items-center gap-3 px-4 py-3">
          <Image src="/fi-logo.png" alt="Fer Inversiones" width={52} height={52} priority className="h-[52px] w-[52px] rounded-2xl object-cover shadow-lg shadow-black/50 ring-1 ring-white/15" />
          <div className="leading-tight">
            <div className="text-xl font-bold tracking-tight">Fer Inversiones</div>
            <div className="text-xs text-violet-300/80">Radar de mercado</div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right text-[11px] text-zinc-500 md:block">{data.count} activos</span>
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${freshChip ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`} title={`Precios: ${liveAge ? liveAge.label : "—"} · Indicadores: ${updated.label}`}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${freshChip ? "bg-emerald-400 motion-safe:animate-pulse" : "bg-amber-400"}`} />
              <div className="leading-tight">
                <div className="text-[9px] uppercase tracking-wide text-zinc-500">{liveAge ? (liveAge.fresh ? "Precios en vivo" : "Últimos precios") : "Última actualización"}</div>
                <div className="nums text-xs font-medium text-zinc-200">{liveAge ? liveAge.txt : updated.rel}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-[#09090b]/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-sm transition-colors duration-200 ${tab === t.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-200"}`}>{t.label}</button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <span className="hidden text-[10px] font-medium uppercase tracking-wide text-zinc-500 md:inline">Vista</span>
              <div className="flex items-center rounded-lg border border-violet-500/40 bg-violet-500/10 p-0.5 shadow-sm shadow-violet-900/20">
                {([["simple", "Simple"], ["pro", "Pro"]] as const).map(([v, lbl]) => (
                  <button key={v} onClick={() => setView(v)} className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${view === v ? "bg-violet-600 text-white shadow" : "text-violet-200/70 hover:text-white"}`}>{lbl}</button>
                ))}
              </div>
            </div>
            <span className="hidden items-center gap-2 md:flex"><MktChip label="SPY" v={data.market.spy_chg} /><MktChip label="QQQ" v={data.market.qqq_chg} /></span>
            <span className="nums hidden sm:inline">{clock}</span>
            <span className={`inline-flex items-center gap-1 ${updated.stale ? "text-amber-400" : "text-zinc-500"}`} title={`Indicadores técnicos (RSI/MACD/score) recalculados: ${updated.label}`}><span className="h-1.5 w-1.5 rounded-full bg-current" /><span className="hidden text-zinc-600 sm:inline">Indicadores</span> {updated.rel}</span>
          </div>
        </div>
      </header>

      {/* FILTROS */}
      <div className="space-y-2 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[11px] uppercase tracking-wide text-zinc-600">Marco</span>
          <div className="flex items-center rounded-lg border border-zinc-800 p-0.5">
            {([["1h", "1h"], ["4h", "4h"]] as const).map(([v, lbl]) => (
              <button key={v} onClick={() => setTf(v)} className={`cursor-pointer rounded-md px-2 py-1 text-xs transition-colors duration-200 ${tf === v ? "bg-zinc-200 font-medium text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}>{lbl}</button>
            ))}
            <span className="mx-0.5 h-4 w-px bg-zinc-800" />
            {([["1d", "Diario"], ["1w", "Semanal"], ["1m", "Mensual"]] as const).map(([v, lbl]) => (
              <button key={v} onClick={() => setTf(v)} className={`cursor-pointer rounded-md px-2.5 py-1 text-xs transition-colors duration-200 ${tf === v ? "bg-zinc-200 font-medium text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}>{lbl}</button>
            ))}
          </div>
          <Tip text="Cambia los indicadores técnicos (RSI, MACD, medias) según el marco temporal. El precio y la variación son siempre los actuales. Para ver el intradía en vivo, abrí el papel: el chart de TradingView del detalle es en tiempo real." className="cursor-help text-zinc-600"><Icon name="help" size={13} /></Tip>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-zinc-600">Ver por</span>
            <div className="flex items-center rounded-lg border border-zinc-800 p-0.5">
              {([["pais", "País"], ["sector", "Sector"], ["ambos", "Ambos"], ["lista", "Sin agrupar"]] as const).map(([g, lbl]) => (
                <button key={g} onClick={() => setGroupBy(g)} className={`cursor-pointer rounded-md px-2.5 py-1 text-xs transition-colors duration-200 ${groupBy === g ? "bg-zinc-200 font-medium text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}>{lbl}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="mr-1 w-12 shrink-0 text-[11px] uppercase tracking-wide text-zinc-600">País</span>
          {presentCountries.map((c) => (
            <Chip key={c} on={countries.has(c)} onClick={() => setCountries((p) => { const n = new Set(p); if (n.has(c)) n.delete(c); else n.add(c); return n; })}>{COUNTRY_META[c].label}</Chip>
          ))}
          {countries.size > 0 && <button onClick={() => setCountries(new Set())} className="shrink-0 cursor-pointer text-[11px] text-zinc-600 hover:text-zinc-300">limpiar</button>}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="mr-1 w-12 shrink-0 text-[11px] uppercase tracking-wide text-zinc-600">Sector</span>
          {presentSectors.map((s) => (
            <Chip key={s} on={sectors.has(s)} onClick={() => setSectors((p) => { const n = new Set(p); if (n.has(s)) n.delete(s); else n.add(s); return n; })}>{s}</Chip>
          ))}
          {sectors.size > 0 && <button onClick={() => setSectors(new Set())} className="shrink-0 cursor-pointer text-[11px] text-zinc-600 hover:text-zinc-300">limpiar</button>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600"><Icon name="search" size={13} /></span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="w-36 rounded-md border border-zinc-800 bg-zinc-900/60 py-1 pl-7 pr-2 text-xs outline-none focus:border-zinc-600" />
          </div>
          {(["FUERTE", "POTENCIAL", "A_REVISAR"] as const).map((k) => (
            <Toggle key={k} on={klass.has(k)} onClick={() => setKlass((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; })}>
              <Icon name={k === "A_REVISAR" ? "alert" : "trendUp"} size={12} /> {CLASS_META[k].label}
            </Toggle>
          ))}
          <Toggle on={onlySignals} onClick={() => setOnlySignals((v) => !v)}>Solo señales</Toggle>
          <Toggle on={onlyFavs} onClick={() => setOnlyFavs((v) => !v)}><Icon name="star" size={12} fill={onlyFavs} /> Mi lista{favs.size > 0 ? ` (${favs.size})` : ""}</Toggle>
        </div>
      </div>

      {/* CONTENIDO: tabla + rail mercado */}
      <div className="flex gap-4 px-4 pb-20">
        <main className="min-w-0 flex-1">
          {tab === "heatmap" ? (
            <Heatmap items={filtered} onSelect={setSelected} />
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">
              {onlyFavs && favs.size === 0 ? (
                <div className="mx-auto max-w-sm">
                  <div className="mb-2 flex justify-center text-amber-400"><Icon name="star" size={28} /></div>
                  <p className="text-zinc-300">Tu lista está vacía</p>
                  <p className="mt-1 text-sm text-zinc-500">Tocá la <Icon name="star" size={13} className="inline -mt-0.5 text-zinc-500" /> al final de cualquier fila para guardar un papel. Se guarda en este navegador.</p>
                </div>
              ) : "Sin resultados con estos filtros."}
            </div>
          ) : view === "simple" ? (
            <SimpleTable groups={groups} favs={favs} onToggleFav={toggle} onSelect={setSelected} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full min-w-[1480px] text-sm">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#141417] text-left text-[11px] uppercase tracking-wide text-zinc-500 shadow-[0_1px_0_#27272a]">
                    <Th>Papel</Th>
                    <Th sortKey="price" sort={sort} onSort={toggleSort} right help={HELP.precio}>Precio</Th>
                    <Th help={HELP.trend7d}>7D</Th>
                    <Th sortKey="score" sort={sort} onSort={toggleSort} center help={HELP.score}>Técnico</Th>
                    <Th help={HELP.senal}>Lectura</Th>
                    <Th sortKey="rsi" sort={sort} onSort={toggleSort} right help={HELP.rsi}>RSI</Th>
                    <Th help={HELP.avwap}>AVWAP</Th>
                    <Th help={HELP.rsihist}>RSI Hist</Th>
                    <Th help={HELP.macd}>MACD</Th>
                    <Th help={HELP.emas}>EMA 7/14</Th>
                    <Th help={HELP.emas}>EMA 21/42</Th>
                    <Th help={HELP.emas}>EMA 100/200</Th>
                    <Th help={HELP.supertrend}>SuperTrend</Th>
                    <Th help={HELP.wavetrend}>WaveT</Th>
                    <Th help={HELP.bbp}>BBP</Th>
                    <Th sortKey="vol" sort={sort} onSort={toggleSort} help={HELP.volumen}>Volumen</Th>
                    <Th help={HELP.flujo}>Flujo</Th>
                    <Th><Tip text="Mi lista — tocá la estrella para guardar el papel (queda en tu navegador)"><Icon name="star" size={12} className="text-zinc-500" /></Tip></Th>
                  </tr>
                </thead>
                {groups.map(([gname, rows]) => (
                  <tbody key={gname}>
                    <tr>
                      <td colSpan={18} className="border-l-2 border-violet-500/60 bg-[#0d0d10] px-3 py-1.5 text-xs font-medium text-zinc-300">{gname} <span className="text-zinc-600">· {rows.length}</span></td>
                    </tr>
                    {rows.map((s) => {
                      const up = (s.chg_pct ?? 0) >= 0;
                      const e = s.emas;
                      return (
                        <tr key={s.ticker} onClick={() => setSelected(s)} className="cursor-pointer border-t border-zinc-800/60 transition-colors hover:bg-zinc-900/50">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2.5">
                              <Logo s={s} />
                              <div className="leading-tight">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <Flag s={s} size={14} />{s.ticker}
                                  {s.defensive && <span className="text-zinc-500" title="Defensiva"><Icon name="shield" size={11} /></span>}
                                </div>
                                <div className="hidden max-w-[150px] truncate text-[11px] text-zinc-600 md:block">{s.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className={`nums text-[15px] font-bold leading-none ${up ? "text-green-400" : "text-red-400"}`}>{fmtPct(s.chg_pct)}</div>
                            <div className="nums mt-0.5 text-[11px] text-zinc-500">{fmtPrice(s.price, s.currency)}</div>
                          </td>
                          <td className="px-3 py-2"><div className="h-7 w-16">{s.spark?.price ? <LineSpark vals={s.spark.price.slice(-8)} color={up ? "#22c55e" : "#ef4444"} w={64} h={26} /> : null}</div></td>
                          <td className="px-3 py-2 text-center"><ScorePips score={s.score} /></td>
                          <td className="px-3 py-2"><div className="flex flex-col gap-0.5"><BiasBadge s={s} /><span className="max-w-[210px] text-[10px] leading-tight text-zinc-600">{s.bias?.text}</span></div></td>
                          <td className="px-3 py-2 text-right"><RsiCell rsi={s.rsi} /></td>
                          <td className="px-3 py-2"><AvwapCell s={s} /></td>
                          <td className="px-3 py-2 text-right"><RsiHistCell v={s.rsi_hist} /></td>
                          <td className="px-3 py-2"><MacdPill s={s} /></td>
                          <td className="px-3 py-2"><EmaPair la="7" lb="14" va={e?.e7 ?? null} vb={e?.e14 ?? null} aa={e?.above.e7 ?? null} ab={e?.above.e14 ?? null} /></td>
                          <td className="px-3 py-2"><EmaPair la="21" lb="42" va={e?.e21 ?? null} vb={e?.e42 ?? null} aa={e?.above.e21 ?? null} ab={e?.above.e42 ?? null} /></td>
                          <td className="px-3 py-2"><EmaPair la="100" lb="200" va={e?.e100 ?? null} vb={e?.e200 ?? null} aa={e?.above.e100 ?? null} ab={e?.above.e200 ?? null} /></td>
                          <td className="px-3 py-2"><SuperTrendCell s={s} /></td>
                          <td className="px-3 py-2"><WaveTrendCell s={s} /></td>
                          <td className="px-3 py-2"><BbpCell s={s} /></td>
                          <td className="px-3 py-2"><VolCell s={s} /></td>
                          <td className="px-3 py-2"><VolFlowCell s={s} /></td>
                          <td className="px-2 py-2 text-center">
                            <button onClick={(e2) => { e2.stopPropagation(); toggle(s.ticker); }} className={`cursor-pointer ${favs.has(s.ticker) ? "text-amber-400" : "text-zinc-700 hover:text-zinc-400"}`} title="Mi lista"><Icon name="star" size={15} fill={favs.has(s.ticker)} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
          )}
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-zinc-600">
            <span className="inline-flex items-center gap-1"><Icon name="trendUp" size={11} /> {tally.fuerte} alcistas</span>
            <span className="inline-flex items-center gap-1"><Icon name="trendUp" size={11} /> {tally.potencial} parciales</span>
            <span className="inline-flex items-center gap-1"><Icon name="alert" size={11} /> {tally.revisar} sobrecomprados</span>
            <span>· Radar de Fer Inversiones · by Facundo Alan · Análisis técnico automatizado, no es recomendación de inversión.</span>
          </p>
        </main>

        <aside className={`hidden shrink-0 transition-[width] duration-200 lg:block ${detailWide ? "w-[620px]" : "w-[360px]"}`}>
          <div className="sticky top-[60px] max-h-[calc(100vh-72px)] overflow-hidden rounded-xl border border-zinc-800">
            {selected ? (
              <div className="h-[calc(100vh-72px)]"><DetailContent s={selected} onClose={() => setSelected(null)} onAnalysis={(t) => { setSelected(null); setAnalysis(t); }} wide={detailWide} onToggleWide={() => setDetailWide((v) => !v)} /></div>
            ) : (
              <div className="max-h-[calc(100vh-72px)] overflow-y-auto p-3"><MarketPanel items={filtered} fng={data.fng} onSelect={setSelected} /></div>
            )}
          </div>
        </aside>
      </div>

      <DetailDrawer s={selected} onClose={() => setSelected(null)} onAnalysis={(t) => { setSelected(null); setAnalysis(t); }} />
      {analysis && byTicker.get(analysis) && (
        <AnalysisMode s={byTicker.get(analysis)!} f={funds[analysis] ?? null} all={viewItems} funds={funds} onSelect={(t) => setAnalysis(t)} onClose={() => setAnalysis(null)} />
      )}
    </div>
  );
}

function Th({ children, sortKey, sort, onSort, right, center, help }: { children?: React.ReactNode; sortKey?: string; sort?: Sort | null; onSort?: (k: string) => void; right?: boolean; center?: boolean; help?: string }) {
  const active = sort && sortKey && sort.key === sortKey;
  const label = help ? <Tip text={help} className="cursor-help border-b border-dotted border-zinc-700">{children}</Tip> : children;
  return (
    <th className={`whitespace-nowrap px-3 py-2.5 font-medium ${right ? "text-right" : center ? "text-center" : "text-left"}`}>
      {sortKey ? (
        <button onClick={() => onSort?.(sortKey)} className={`inline-flex cursor-pointer items-center gap-1 hover:text-zinc-300 ${active ? "text-zinc-200" : ""} ${right ? "flex-row-reverse" : ""}`}>
          {label}<Icon name={active ? (sort!.dir === "desc" ? "arrowDown" : "arrowUp") : "sort"} size={10} className="text-zinc-600" />
        </button>
      ) : label}
    </th>
  );
}

function MktChip({ label, v }: { label: string; v: number | null }) {
  const up = (v ?? 0) >= 0;
  return <span className="inline-flex items-center gap-1 rounded border border-zinc-800 px-1.5 py-0.5"><span className="text-zinc-500">{label}</span><span className={`nums ${up ? "text-green-400" : "text-red-400"}`}>{v == null ? "—" : fmtPct(v)}</span></span>;
}
