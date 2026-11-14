import { isNativeApp, SITE_URL } from "./native";

/**
 * Prefixo do site publicado (ex.: "/elo-saude" no GitHub Pages). O <Link> do
 * Next já aplica o basePath; isto é para fetch() e URLs montadas à mão.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return BASE_PATH + path;
}

/** Endereço completo para links que saem do aparelho. No app, aponta para o site público (o endereço interno do app não abre fora dele). */
export function absoluteUrl(path: string): string {
  if (isNativeApp()) return SITE_URL + path;
  return window.location.origin + BASE_PATH + path;
}
