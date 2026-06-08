import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { esES } from "@clerk/localizations";
import { cookies } from "next/headers";
import { PasswordGate } from "@/components/PasswordGate";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Radar — Fer Inversiones",
  description:
    "Radar de mercado de Fer Inversiones: señales técnicas (RSI, MACD, medias móviles) por papel. Análisis automatizado, no es recomendación de inversión.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gated = (await cookies()).get("fi_gate")?.value === "ok";
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ClerkProvider appearance={{ baseTheme: dark, variables: { colorPrimary: "#7c3aed" } }} localization={esES}>
          {gated ? children : <PasswordGate />}
        </ClerkProvider>
      </body>
    </html>
  );
}