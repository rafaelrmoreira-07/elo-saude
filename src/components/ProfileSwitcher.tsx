"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { listProfiles, resetDemo, switchProfile } from "@/lib/store";
import type { Db } from "@/lib/types";
import { CheckIcon, ChevronDown } from "./icons";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

/** Cor fixa por perfil, para reconhecer de relance (como as contas no Instagram). */
const TONES: Record<string, string> = {
  carlos: "bg-ink text-white",
  juliana: "bg-accent text-ink",
  lucia: "bg-ok text-white",
  pedro: "bg-navy-200 text-ink",
  nova: "bg-white text-ink ring-1 ring-line-strong",
};

export function Avatar({ id, name, size = 56 }: { id: string; name: string; size?: number }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-medium ${TONES[id] ?? TONES.nova}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Troca de perfil em Configurações, no estilo das várias contas do Instagram:
 * toca no nome, escolhe outro perfil. Cada perfil guarda os próprios dados e
 * a própria conversa; trocar não apaga nada.
 */
export function ProfileSwitcher({ db }: { db: Db }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const profiles = listProfiles(db);
  const current = profiles.find((p) => p.active)!;

  return (
    <Drawer.Root open={open} onOpenChange={(v) => { setOpen(v); setConfirmReset(false); }}>
      <Drawer.Trigger asChild>
        <button type="button" className="-ml-1 inline-flex min-h-11 max-w-full items-center gap-1 rounded-lg px-1 text-left" aria-label={`Perfil: ${current.name}. Trocar de perfil`}>
          <span className="truncate text-lg font-medium text-ink">{current.name}</span>
          <ChevronDown width={18} className="shrink-0 text-ink" />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-navy-900/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-md flex-col rounded-t-[28px] bg-white outline-none">
          <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-line-strong" aria-hidden />
          <Drawer.Title className="px-5 pt-4 text-center text-lg font-medium text-ink">Trocar de perfil</Drawer.Title>
          <Drawer.Description className="px-5 pt-1 text-center text-sm text-muted">Plano Família: até 5 perfis, cada um com os próprios exames, sinais e conversa.</Drawer.Description>
          <ul className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">
            {profiles.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-current={p.active ? "true" : undefined}
                  className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-surface"
                  onClick={() => {
                    setOpen(false);
                    if (p.active) return;
                    switchProfile(p.id);
                    toast.success(`Perfil de ${p.name}`);
                    router.push("/");
                  }}
                >
                  <Avatar id={p.id} name={p.name} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{p.name}</span>
                    <span className="block truncate text-sm text-muted">{p.detail}</span>
                  </span>
                  {p.active && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                      <CheckIcon width={14} />
                      <span className="sr-only">Perfil atual</span>
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            {!confirmReset ? (
              <button type="button" className="btn-quiet w-full justify-center text-sm text-danger" onClick={() => setConfirmReset(true)}>
                Restaurar {current.name} aos dados iniciais
              </button>
            ) : (
              <div className="rounded-2xl bg-danger-soft p-3" role="group" aria-label="Confirmar restauração">
                <p className="text-sm text-ink">Os exames enviados, os acessos e a conversa deste perfil serão apagados. Os outros perfis não mudam.</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmReset(false)}>Cancelar</button>
                  <button
                    type="button"
                    className="btn-danger flex-1"
                    onClick={async () => {
                      await resetDemo();
                      setOpen(false);
                      toast.success("Perfil restaurado");
                      router.push("/");
                    }}
                  >
                    Restaurar
                  </button>
                </div>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
