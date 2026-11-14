import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { Toaster } from "@/components/base/toaster";
import { PersonaFromUrl } from "@/components/PersonaFromUrl";
import "./globals.css";

/** Fonte única, sorteada pela taste-skill para clínicas: neo-grotesca calma e confiável. */
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Elo Saúde · seus exames e medições num lugar só",
  description: "Exames, consultas, remédios, vacinas e medições do relógio organizados para você e para o seu médico.",
  applicationName: "Elo Saúde",
  // O link do médico leva o token na URL: nada de mandá-lo a outros sites
  referrer: "no-referrer",
};

/**
 * Política de segurança de conteúdo (só no build publicado; o modo de
 * desenvolvimento do Next precisa de eval). Limita para onde o app pode mandar
 * dados: o próprio site e a IA (Gemini, ou o servidor intermediário).
 */
const AI_ORIGIN = (() => {
  try {
    return process.env.NEXT_PUBLIC_AI_PROXY_URL ? new URL(process.env.NEXT_PUBLIC_AI_PROXY_URL).origin : "";
  } catch {
    return "";
  }
})();
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://generativelanguage.googleapis.com ${AI_ORIGIN}`.trim(),
  "frame-src 'self' blob: data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** mobile-native (Emil): conteúdo até as bordas, com o recuo do notch feito no CSS. */
export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${hanken.variable} h-full antialiased`}>
      {process.env.NODE_ENV === "production" && (
        <head>
          <meta httpEquiv="Content-Security-Policy" content={CSP} />
        </head>
      )}
      <body className="min-h-full">
        <PersonaFromUrl />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
