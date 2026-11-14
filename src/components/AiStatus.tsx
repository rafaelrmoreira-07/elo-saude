"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { aiConsented, geminiConfigured } from "@/lib/gemini";
import { ChevronRight, ScanIcon } from "./icons";

function subscribe(cb: () => void) {
  window.addEventListener("elo-saude:gemini-key", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("elo-saude:gemini-key", cb);
    window.removeEventListener("storage", cb);
  };
}

/** true/false no navegador; null durante a pré-renderização. */
export function useAiEnabled(): boolean | null {
  return useSyncExternalStore(subscribe, geminiConfigured, () => null);
}

export function AiStatusBanner() {
  const enabled = useAiEnabled();
  if (enabled !== false) return null;
  if (!aiConsented())
    return (
      <Link href="/configuracoes/#dados" className="lift mt-4 flex items-center gap-3 rounded-2xl border border-line p-4 text-sm text-muted">
        <ScanIcon width={22} className="shrink-0 text-ink" />
        <span className="flex-1">
          <span className="block font-medium text-ink">Leitura por IA desligada</span>
          Você preenche os valores dos laudos à mão. Para ligar, vá em Privacidade e dados.
        </span>
        <ChevronRight width={18} className="shrink-0 text-faint" />
      </Link>
    );
  return (
    <Link href="/enviar" className="lift mt-4 flex items-center gap-3 rounded-2xl border border-line p-4 text-sm text-muted">
      <ScanIcon width={22} className="shrink-0 text-ink" />
      <span className="flex-1">
        <span className="block font-medium text-ink">Leitura por IA indisponível agora</span>
        Os laudos recentes da tela Enviar já estão lidos. Outros laudos podem ser enviados e preenchidos à mão.
      </span>
      <ChevronRight width={18} className="shrink-0 text-faint" />
    </Link>
  );
}
