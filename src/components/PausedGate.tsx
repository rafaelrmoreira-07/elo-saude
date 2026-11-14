"use client";

import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { isPaused, resumePlan, useSubscription } from "@/lib/subscription";
import { AlertIcon } from "./icons";

/**
 * Plano pausado: o app fica só para consulta. Telas de enviar, conectar,
 * compartilhar e conversar mostram este aviso no lugar da ação. Ver o
 * histórico, exportar e revogar acessos continuam liberados (LGPD).
 */
export function PausedGate({ action, children }: { action: string; children: React.ReactNode }) {
  const sub = useSubscription();
  if (!isPaused(sub)) return <>{children}</>;
  return <PausedNotice action={action} until={sub!.pausedUntil} />;
}

export function PausedNotice({ action, until, compact }: { action: string; until?: string; compact?: boolean }) {
  return (
    <section role="status" className={`rounded-2xl bg-warn-soft ${compact ? "p-3" : "mt-2 p-4"}`}>
      <p className="flex gap-2 text-[15px] font-medium text-ink">
        <AlertIcon width={20} className="mt-0.5 shrink-0 text-warn" /> Seu plano está pausado{until ? ` até ${formatDate(until)}` : ""}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink">
        Para {action}, retome o plano. Você pode pausar de novo depois; os dias já pausados contam no limite de 30. Ver e exportar o seu histórico
        continua liberado.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={resumePlan}>Retomar plano</button>
        <Link href="/planos" className="btn-quiet text-sm">Ver meu plano</Link>
      </div>
    </section>
  );
}

/** true quando o plano está pausado (para esconder ações menores). */
export function usePlanPaused(): boolean {
  return isPaused(useSubscription());
}
