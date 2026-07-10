"use client";

import { useState } from "react";
import Image from "next/image";

// Pantalla de acceso con contraseña compartida (estética tipo Clerk).
// Al validar, /api/gate setea la cookie y recargamos -> el server muestra el panel.
export function PasswordGate() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<null | "bad" | "rate">(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (r.ok) {
        window.location.reload();
        return;
      }
      setErr(r.status === 429 ? "rate" : "bad");
    } catch {
      setErr("bad");
    }
    setLoading(false);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#09090b] p-4">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[110px]" />
      <form onSubmit={submit} className="relative w-full max-w-[400px] rounded-2xl border border-zinc-800 bg-[#161619] p-7 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <Image src="/fi-logo.png" alt="Fer Inversiones" width={64} height={64} priority className="rounded-2xl ring-1 ring-white/15" />
          <h1 className="mt-4 text-xl font-bold tracking-tight">Fer Inversiones</h1>
          <p className="mt-1 text-sm leading-snug text-zinc-500">
            Ingresá la contraseña del grupo<br />para entrar al <span className="text-violet-300">Radar de mercado</span>
          </p>
        </div>

        <div className="mt-6">
          <label className="text-xs font-medium text-zinc-400">Contraseña</label>
          <input
            type="password"
            autoFocus
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(null); }}
            placeholder="••••••••"
            className={`nums mt-1.5 w-full rounded-lg border bg-zinc-900/60 px-3 py-2.5 text-sm tracking-widest outline-none transition-colors ${err ? "border-red-500/60" : "border-zinc-700 focus:border-violet-500"}`}
          />
          {err === "bad" && <p className="mt-1.5 text-xs text-red-400">Contraseña incorrecta.</p>}
          {err === "rate" && <p className="mt-1.5 text-xs text-red-400">Demasiados intentos. Esperá un minuto.</p>}
        </div>

        <button
          type="submit"
          disabled={loading || !pw}
          className="mt-5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-default disabled:opacity-50"
        >
          {loading ? "Verificando…" : "Entrar"}
        </button>

        <p className="mt-4 text-center text-xs text-zinc-500">¿No tenés la contraseña? Pedila en el grupo.</p>
        <p className="mt-3 text-center text-[11px] text-zinc-600">Acceso privado · Fer Inversiones</p>
      </form>
    </div>
  );
}
