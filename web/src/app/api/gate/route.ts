import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

// Rate-limit naive en memoria: 10 intentos/min por IP contra fuerza bruta de la contraseña.
// ponytail: por-instancia (serverless no comparte memoria) -> best-effort; si hiciera falta
// algo serio, mover a un KV/Upstash. Alcanza para frenar un scriptcito básico.
const HITS = new Map<string, { n: number; reset: number }>();
function limited(ip: string) {
  const now = Date.now();
  const e = HITS.get(ip);
  if (!e || now > e.reset) { HITS.set(ip, { n: 1, reset: now + 60_000 }); return false; }
  e.n += 1;
  return e.n > 10;
}

// Valida la contraseña compartida del grupo contra SITE_GATE_PASSWORD (server-only).
// La contraseña NO viaja al navegador. Si es correcta, setea una cookie y el server muestra el panel.
export async function POST(req: Request) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return NextResponse.json({ ok: false }, { status: 429 });
  const { password } = await req.json().catch(() => ({ password: "" }));
  const expected = process.env.SITE_GATE_PASSWORD || "";
  const ok = typeof password === "string" && password.length > 0 && password === expected;
  if (ok) {
    (await cookies()).set("fi_gate", "ok", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
