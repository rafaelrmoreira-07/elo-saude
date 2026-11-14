"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_CATALOG, CENTRAL_ID, type AppInfo } from "@/lib/healthApps";
import { healthHubName } from "@/lib/native";
import { useDb } from "@/lib/store";
import { CheckIcon, ChevronDown } from "./icons";
import { HealthConnectCard, usePlatform } from "./HealthConnect";
import { SectionTitle } from "./ui";

const importHref = (app: string, kind?: "ia") => `/enviar/?tipo=relogio&app=${encodeURIComponent(app)}${kind ? `&k=${kind}` : ""}`;

/** Lista de apps que o Elo aceita, com o caminho de conexão de cada um. */
export function ConnectCatalog() {
  const db = useDb();
  const platform = usePlatform();
  const connected = new Set((db?.apps ?? []).map((a) => a.id));
  const centrals = APP_CATALOG.filter((a) => a.kind === "central");
  const makers = APP_CATALOG.filter((a) => a.kind === "fabricante");

  return (
    <div>
      <div className="mb-2 empty:hidden">
        <HealthConnectCard />
      </div>

      <SectionTitle>Central de saúde do celular</SectionTitle>
      <ul className="space-y-2">{centrals.map((a) => <CatalogRow key={a.id} app={a} connected={connected.has(a.id)} platform={platform} />)}</ul>

      <SectionTitle>Relógio, anel ou medidor</SectionTitle>
      <ul className="space-y-2">{makers.map((a) => <CatalogRow key={a.id} app={a} connected={connected.has(a.id)} platform={platform} />)}</ul>

      <SectionTitle>App de saúde com IA ou outro app</SectionTitle>
      <OtherApp />
    </div>
  );
}

function CatalogRow({ app, connected, platform }: { app: AppInfo; connected: boolean; platform: "web" | "ios" | "android" }) {
  const native = platform !== "web";
  const viaHub = native && app.kind === "fabricante" && app.syncs.includes(platform);
  const isMyHub = native && app.id === CENTRAL_ID[platform];
  return (
    <li>
      <details className="tile group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium text-ink">{app.name}</span>
            <span className="block text-sm text-muted">{app.brings}</span>
          </span>
          {connected && (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink">
              <CheckIcon width={14} /> Conectado
            </span>
          )}
          <ChevronDown width={18} className="shrink-0 text-faint transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm leading-relaxed text-muted">
          {isMyHub && <p>Use o botão de conexão no topo desta tela: o Elo lê direto, com a sua permissão.</p>}
          {viaHub && (
            <p>
              No app {app.name}, ligue o envio de dados para o {healthHubName(platform)}. Depois toque em Sincronizar: o Elo lê de lá e mostra o {app.name} e os
              seus aparelhos em Configurações.
            </p>
          )}
          {!native && app.syncs.length > 0 && (
            <p>No app do Elo para {app.syncs.map((p) => (p === "ios" ? "iPhone" : "Android")).join(" e ")}, os dados chegam sozinhos pelo {app.syncs.map((p) => healthHubName(p)).join(" ou ")}.</p>
          )}
          <p>Pelo arquivo: {app.export}</p>
          <Link href={importHref(app.id)} className="btn-secondary w-full">Importar arquivo do {app.name}</Link>
        </div>
      </details>
    </li>
  );
}

function OtherApp() {
  const [name, setName] = useState("");
  const [ia, setIa] = useState(true);
  const valid = name.trim().length >= 2;
  return (
    <div className="tile space-y-3">
      <p className="text-sm leading-relaxed text-muted">
        Apps de saúde com IA (como o ChatHealth) e outros apps entram pelo relatório ou arquivo que eles exportam: PDF, planilha, JSON ou print da tela. A IA
        organiza os números por dia.
      </p>
      <label className="block">
        <span className="label">Nome do app</span>
        <input className="input" value={name} maxLength={40} placeholder="Ex.: ChatHealth" onChange={(e) => setName(e.target.value)} />
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
      {valid ? (
        <Link href={`/enviar/?tipo=relogio&app=${encodeURIComponent(name.trim())}&k=${ia ? "ia" : "outro"}`} className="btn-primary w-full">
          Importar arquivo do {name.trim()}
        </Link>
      ) : (
        <button type="button" className="btn-primary w-full" disabled>
          Importar arquivo
        </button>
      )}
    </div>
  );
}
