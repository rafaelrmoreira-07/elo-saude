"use client";

import Link from "next/link";
import { shareState } from "@/lib/share";
import { useDb } from "@/lib/store";
import { ChevronRight, ShieldIcon } from "./icons";

/** Atalho para ver e revogar quem tem acesso ao histórico (antes era a aba "Acessos"). */
export function AccessButton() {
  const db = useDb();
  const active = db?.shares.filter((s) => shareState(s) === "ativo").length ?? 0;
  return (
    <Link href="/acessos" className="tile lift mb-4 flex min-h-16 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink">
        <ShieldIcon width={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-ink">Quem tem acesso aos seus dados</span>
        <span className="block text-sm text-muted">
          {!db ? " " : active ? `${active} ${active === 1 ? "acesso ativo" : "acessos ativos"}. Veja ou revogue.` : "Nenhum acesso ativo agora."}
        </span>
      </span>
      <ChevronRight width={18} className="shrink-0 text-faint" />
    </Link>
  );
}
