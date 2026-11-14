"use client";

import { asset } from "@/lib/paths";
import { POLICY_VERSION, saveConsents, useDb } from "@/lib/store";
import { ShieldIcon } from "./icons";

/**
 * LGPD: quando a política de privacidade muda, quem já tinha aceitado vê o
 * aviso e aceita de novo. O consentimento da IA continua como estava.
 */
export function PolicyUpdate() {
  const db = useDb();
  const c = db?.consents;
  if (!c || c.policyVersion === POLICY_VERSION) return null;
  return (
    <section className="mx-5 mt-2 flex gap-3 rounded-2xl bg-navy-50 p-4 text-[15px] text-ink" aria-label="Política de privacidade atualizada">
      <ShieldIcon width={22} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">A política de privacidade mudou</p>
        <p className="mt-0.5 text-sm text-ink-soft">
          Leia o que mudou e confirme para continuar usando os seus dados no Elo.{" "}
          <a href={asset("/privacidade.html")} target="_blank" rel="noopener" className="font-medium underline underline-offset-4">Ler a política</a>
        </p>
        <button type="button" className="btn-primary mt-3 w-full" onClick={() => saveConsents(c.ia)}>Li e concordo</button>
      </div>
    </section>
  );
}
