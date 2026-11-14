"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { syncAlerts } from "@/lib/chat";
import { openChat } from "@/lib/chatOpen";
import { computeAlerts } from "@/lib/health";
import { useDb } from "@/lib/store";

/**
 * Leva os alertas para a conversa e, quando aparece um alerta novo, avisa
 * com um toast do Sonner, que empilha vários avisos sem sobrepor.
 */
export function ChatNotifier() {
  const db = useDb();

  useEffect(() => {
    if (!db || !db.patient.name.trim()) return; // ainda no guia de boas-vindas
    const fresh = syncAlerts(db.patient.name.split(" ")[0], computeAlerts(db));
    for (const a of fresh) {
      const urgent = a.severity === "procure_medico";
      // Preferências de Configurações > Avisos. Os que pedem médico sempre avisam.
      const locked = urgent || a.kind === "ritmo_irregular" || a.kind === "apneia";
      if (!locked && (db.prefs?.toast === false || db.prefs?.notify?.[a.kind] === false)) continue;
      toast[urgent ? "error" : "warning"](urgent ? `Procure um médico: ${a.title}` : a.title, {
        id: `alerta-${a.id}`,
        description: a.message,
        duration: 9000,
        action: { label: "Abrir", onClick: () => openChat() },
      });
    }
  }, [db]);

  return null;
}
