import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Valida la contraseña compartida del grupo contra SITE_GATE_PASSWORD (server-only).
// La contraseña NO viaja al navegador. Si es correcta, setea una cookie y el server muestra el panel.
export async function POST(req: Request) {
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
