import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Incluye los JSON de datos en el trace del servidor para que la revalidación (ISR)
  // pueda leerlos en Vercel aunque no se configure SIGNALS_URL.
  outputFileTracingIncludes: {
    "/": ["./public/data/*.json"],
  },
};

export default nextConfig;
