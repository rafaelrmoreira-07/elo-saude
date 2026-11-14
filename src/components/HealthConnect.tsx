"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/dates";
import { connectHealth, HealthSyncError, readHealthDays } from "@/lib/healthSync";
import { appPlatform, healthHubName } from "@/lib/native";
import { saveConnectedWearables, useDb } from "@/lib/store";
import { HeartIcon } from "./icons";

const subscribeNoop = () => () => {};
/** Plataforma só no navegador (no build estático é sempre "web"). */
export function usePlatform() {
  return useSyncExternalStore(subscribeNoop, appPlatform, () => "web" as const);
}

/** Lê a central de saúde e salva. Usado no botão e na sincronização ao abrir o app. */
export async function syncNow(): Promise<number> {
  const p = appPlatform();
  if (p === "web") return 0;
  const { days, found } = await readHealthDays();
  return saveConnectedWearables(days, p, found);
}

/**
 * Cartão de conexão com o Apple Saúde (iPhone) ou o Health Connect (Android).
 * Só aparece dentro do app; no site, a pessoa importa o arquivo exportado.
 */
export function HealthConnectCard() {
  const platform = usePlatform();
  const db = useDb();
  const [busy, setBusy] = useState(false);
  if (platform === "web" || !db) return null;

  const hub = healthHubName(platform);
  const src = db.wearableSource;
  const connected = src?.connected === platform;

  async function run(first: boolean) {
    setBusy(true);
    try {
      if (first) await connectHealth();
      const n = await syncNow();
      if (n) toast.success(`${hub} sincronizado`, { description: `${n} dias com medições.` });
      else toast(`Nenhuma medição encontrada no ${hub}`, { description: "Confira se o relógio, o anel ou o medidor gravam os dados lá, e se o Elo tem permissão de leitura." });
    } catch (e) {
      toast.error(`Não consegui ler o ${hub}`, { description: e instanceof HealthSyncError ? e.message : "Tente de novo. Se continuar, confira a permissão do Elo nos ajustes do celular." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tile flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink"><HeartIcon width={20} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-ink">{hub}</p>
        {connected ? (
          <p className="text-sm text-muted">Conectado. Última leitura {src?.importedAt ? formatDateTime(src.importedAt) : "agora"}. O Elo atualiza sozinho ao abrir.</p>
        ) : (
          <p className="text-sm text-muted">
            {platform === "ios"
              ? "Leia os dados que o Apple Watch e outros aparelhos gravam no app Saúde: batimentos, sono, saturação, passos e pressão."
              : "Leia os dados que o relógio, o anel ou o medidor gravam no Health Connect: batimentos, sono, saturação, passos e pressão."}{" "}
            Os dados ficam no seu celular.
          </p>
        )}
        <button type="button" className={`${connected ? "btn-secondary" : "btn-primary"} mt-3 w-full`} disabled={busy} onClick={() => run(!connected)}>
          {busy ? "Lendo…" : connected ? "Sincronizar agora" : `Conectar ao ${hub}`}
        </button>
      </div>
    </div>
  );
}

/** Ao abrir o app, atualiza os dados do relógio se a última leitura tiver mais de 1 hora. */
export function AppHealthAutoSync() {
  const platform = usePlatform();
  const db = useDb();
  const connected = platform !== "web" && db?.wearableSource?.connected === platform;
  const last = db?.wearableSource?.importedAt;
  useEffect(() => {
    if (!connected) return;
    const stale = !last || Date.now() - new Date(last).getTime() > 3_600_000;
    if (stale) syncNow().catch(() => {});
  }, [connected, last]);
  return null;
}
