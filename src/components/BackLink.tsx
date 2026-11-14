"use client";

import { useRouter } from "next/navigation";
import { BackIcon } from "./icons";

/** Volta para a tela de onde a pessoa veio (Enviar, Configurações ou Sinais); sem histórico, vai para o destino padrão. */
export function BackLink({ fallback }: { fallback: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="-ml-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-[15px] font-medium text-ink"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
    >
      <BackIcon width={20} /> Voltar
    </button>
  );
}
