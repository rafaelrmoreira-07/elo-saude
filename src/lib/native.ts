/**
 * Onde o Elo está rodando: no navegador (site) ou dentro do app de iPhone ou
 * Android (Capacitor). No app aparecem a conexão com o Apple Saúde / Health
 * Connect e o compartilhamento nativo de arquivos.
 */
import { Capacitor } from "@capacitor/core";

export type AppPlatform = "ios" | "android" | "web";

export function appPlatform(): AppPlatform {
  if (typeof window === "undefined") return "web";
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : "web";
}

export const isNativeApp = () => appPlatform() !== "web";

/** Nome da central de saúde do celular, para os textos. */
export function healthHubName(p: AppPlatform = appPlatform()): string {
  return p === "ios" ? "Apple Saúde" : p === "android" ? "Health Connect" : "app de saúde do celular";
}

/** Endereço público do site, usado nos links que saem do app (ex.: relatório para o médico). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://rafaelrmoreira-07.github.io/elo-saude").replace(/\/$/, "");
