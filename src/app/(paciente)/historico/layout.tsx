import type { Metadata } from "next";

/** Título da aba do navegador desta tela, para o leitor de tela anunciar onde a pessoa está (WCAG 2.4.2). */
export const metadata: Metadata = { title: "Histórico · Elo Saúde" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
