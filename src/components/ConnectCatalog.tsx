"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { connectHealth, HealthSyncError } from "@/lib/healthSync";
import { APP_CATALOG, CENTRAL_ID, type AppInfo } from "@/lib/healthApps";
import { healthHubName } from "@/lib/native";
import { getDbSnapshot, useDb } from "@/lib/store";
import { CheckIcon } from "./icons";
import { syncNow, usePlatform } from "./HealthConnect";
import { SectionTitle } from "./ui";

type Platform = "web" | "ios" | "android";

const importHref = (app: string, kind?: "ia" | "outro") => `/enviar/?tipo=relogio&app=${encodeURIComponent(app)}${kind ? `&k=${kind}` : ""}`;

/**
 * Lista de apps que o Elo aceita. Cada app tem as duas opções lado a lado:
 * Conectar (leitura direta pelo app do Elo no celular, quando existe) e
 * Importar arquivo (o que o app exporta), para quando conectar não for o caso.
 */
export function ConnectCatalog() {
  const db = useDb();
  const platform = usePlatform();
  const connected = new Set((db?.apps ?? []).map((a) => a.id));
  const centrals = APP_CATALOG.filter((a) => a.kind === "central");
  const makers = APP_CATALOG.filter((a) => a.kind === "fabricante");

  return (
    <div>
      <SectionTitle>Central de saúde do celular</SectionTitle>
      <ul className="space-y-2">{centrals.map((a) => <CatalogRow key={a.id} app={a} connected={connected.has(a.id)} platform={platform} />)}</ul>

      <SectionTitle>Relógio, anel ou medidor</SectionTitle>
      <ul className="space-y-2">{makers.map((a) => <CatalogRow key={a.id} app={a} connected={connected.has(a.id)} platform={platform} />)}</ul>

      <SectionTitle>App de saúde com IA ou outro app</SectionTitle>
      <OtherApp />
    </div>
  );
}

/** Como conectar este app nesta plataforma: direto, pela central do celular, só no app do celular, ou não dá. */
function connectMode(app: AppInfo, platform: Platform): "direto" | "central" | "outro_celular" | "nenhum" {
  if (platform === "web") return app.syncs.length ? "outro_celular" : "nenhum";
  if (app.kind === "central") return app.id === CENTRAL_ID[platform] ? "direto" : "outro_celular";
  return app.syncs.includes(platform) ? "central" : "nenhum";
}

function CatalogRow({ app, connected, platform }: { app: AppInfo; connected: boolean; platform: Platform }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const mode = connectMode(app, platform);
  const hub = platform === "web" ? null : healthHubName(platform);
  const live = mode === "direto" || mode === "central";

  const howTo =
    mode === "direto"
      ? "Conectar lê os dados direto do celular, com a sua permissão."
      : mode === "central"
        ? `Conectar lê o ${app.name} pelo ${hub}: no app ${app.name}, deixe ligado o envio de dados para o ${hub}.`
        : mode === "outro_celular"
          ? `Conectar funciona no app do Elo para ${app.syncs.map((p) => (p === "ios" ? "iPhone" : "Android")).join(" e ")}.`
          : "Este app não permite conexão direta neste celular.";

  async function connect() {
    if (!live) {
      setNote(mode === "nenhum" ? `O ${app.name} não manda dados para o ${hub ?? "celular"}. Use Importar arquivo.` : "Aqui no navegador, use Importar arquivo.");
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      await connectHealth();
      const n = await syncNow();
      const found = mode === "direto" || getDbSnapshot().apps?.some((a) => a.id === app.id);
      if (found) toast.success(`${app.name} conectado`, { description: n ? `${n} dias com medições.` : "Ainda sem medições." });
      else setNote(`O ${hub} está conectado, mas ainda não há dados do ${app.name}. No app ${app.name}, ligue o envio para o ${hub} e toque em Conectar de novo.`);
    } catch (e) {
      setNote(e instanceof HealthSyncError ? e.message : `Não consegui ler o ${hub}. Confira a permissão do Elo nos ajustes do celular.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="tile">
      <div className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-ink">{app.name}</span>
          <span className="block text-sm text-muted">{app.brings}</span>
        </span>
        {connected && (
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink">
            <CheckIcon width={14} /> Conectado
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className={`${live ? "btn-primary" : "btn-secondary"} min-h-11 px-3 text-sm`} disabled={busy} aria-label={`${connected && live ? "Sincronizar" : "Conectar"} ${app.name}`} aria-describedby={`como-${app.id}`} onClick={connect}>
          {busy ? "Conectando…" : connected && live ? "Sincronizar" : "Conectar"}
        </button>
        <Link href={importHref(app.id)} aria-label={`Importar arquivo do ${app.name}`} className="btn-secondary min-h-11 px-3 text-sm">
          Importar arquivo
        </Link>
      </div>
      <p id={`como-${app.id}`} className="mt-2 text-xs leading-relaxed text-muted">
        {howTo} Para importar: {app.export.charAt(0).toLowerCase() + app.export.slice(1)}
      </p>
      {note && (
        <p className="mt-2 rounded-xl bg-navy-50 p-3 text-sm text-ink" role="status">
          {note}
        </p>
      )}
    </li>
  );
}

function OtherApp() {
  const [name, setName] = useState("");
  const [ia, setIa] = useState(true);
  const [note, setNote] = useState(false);
  const valid = name.trim().length >= 2;
  return (
    <div className="tile space-y-3">
      <label className="block">
        <span className="label">Nome do app</span>
        <input className="input" value={name} maxLength={40} placeholder="Ex.: ChatHealth" onChange={(e) => { setName(e.target.value); setNote(false); }} />
      </label>
      <fieldset>
        <legend className="label">Tipo</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: true, label: "App de saúde com IA" },
            { v: false, label: "Outro app" },
          ].map((o) => (
            <label key={String(o.v)} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-center text-[15px] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${ia === o.v ? "border-ink bg-navy-50 font-medium text-ink" : "border-control text-ink-soft"}`}>
              <input type="radio" name="tipo-app" className="sr-only" checked={ia === o.v} onChange={() => setIa(o.v)} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary min-h-11 px-3 text-sm" disabled={!valid} onClick={() => setNote(true)}>
          Conectar
        </button>
        {valid ? (
          <Link href={importHref(name.trim(), ia ? "ia" : "outro")} className="btn-primary min-h-11 px-3 text-sm">
            Importar arquivo
          </Link>
        ) : (
          <button type="button" className="btn-primary min-h-11 px-3 text-sm" disabled>
            Importar arquivo
          </button>
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Se o app grava no app Saúde do iPhone ou no Health Connect, os dados dele chegam ao conectar a central. Se não, importe o relatório ou o arquivo que ele exporta:
        PDF, planilha, JSON ou print da tela.
      </p>
      {note && valid && (
        <p className="rounded-xl bg-navy-50 p-3 text-sm text-ink" role="status">
          O {name.trim()} não tem conexão direta com o Elo. Se ele grava no app Saúde ou no Health Connect, conecte a central lá em cima. Se não, use Importar arquivo.
        </p>
      )}
    </div>
  );
}
