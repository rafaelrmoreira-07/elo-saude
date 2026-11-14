"use client";

import Link from "next/link";
import { useState } from "react";
import { Switch } from "@/components/base/switch";
import { ChevronRight } from "@/components/icons";
import { ProfileSettings } from "@/components/ProfileSettings";
import { ReadingQuality } from "@/components/ReadingQuality";
import { PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { ageFrom, formatDate } from "@/lib/dates";
import { shareState } from "@/lib/share";
import { updatePrefs, useDb } from "@/lib/store";
import type { Db, HealthAlert, Patient } from "@/lib/types";

/** Tipos de alerta e se podem ser silenciados. Os que pedem médico ficam sempre ligados. */
const ALERT_PREFS: { kind: HealthAlert["kind"]; label: string; locked?: boolean }[] = [
  { kind: "ritmo_irregular", label: "Ritmo cardíaco irregular", locked: true },
  { kind: "apneia", label: "Sinais de apneia do sono", locked: true },
  { kind: "pressao", label: "Pressão acima da meta" },
  { kind: "fc_repouso", label: "Batimentos em repouso mais altos" },
  { kind: "exames", label: "Exames fora da referência" },
];

/**
 * Configurações na estrutura da branch-plinio (cabeçalho do perfil, perfil de
 * saúde, contato de emergência, aparelhos, avisos, privacidade e dados, sobre),
 * com o visual atual do app.
 */
export default function ConfiguracoesPage() {
  const db = useDb();
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <PageHeader title="Configurações" />
      {!db ? (
        <Skeleton lines={5} />
      ) : (
        <>
          <ProfileHeader patient={db.patient} editing={editing} onEdit={() => setEditing(true)} />

          {editing ? (
            <div className="mt-3">
              <ProfileSettings onDone={() => setEditing(false)} />
            </div>
          ) : (
            <>
              <SectionTitle id="perfil">Perfil de saúde</SectionTitle>
              <dl className="tile divide-y divide-line py-0 text-[15px]">
                <Row label="Nascimento" value={db.patient.birthDate ? `${formatDate(db.patient.birthDate)} · ${ageFrom(db.patient.birthDate)} anos` : "Não informado"} />
                <Row label="Sexo" value={db.patient.sex === "F" ? "Feminino" : "Masculino"} />
                <Row label="Tipo sanguíneo" value={db.patient.bloodType || "Não informado"} />
                <Row label="Alergias" value={db.patient.allergies.join(", ") || "Nenhuma conhecida"} danger={db.patient.allergies.length > 0} />
              </dl>

              <SectionTitle>Contato de emergência</SectionTitle>
              {db.patient.emergencyContact ? (
                <div className="tile flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-ink">{db.patient.emergencyContact.name}</p>
                    <p className="num text-sm text-muted">{db.patient.emergencyContact.phone}</p>
                  </div>
                  <a href={`tel:${db.patient.emergencyContact.phone.replace(/[^\d+]/g, "")}`} className="btn-secondary shrink-0">Ligar</a>
                </div>
              ) : (
                <button type="button" className="tile w-full text-left text-[15px] text-muted" onClick={() => setEditing(true)}>
                  Nenhum contato cadastrado. <span className="font-medium text-ink underline underline-offset-4">Adicionar</span>
                </button>
              )}
            </>
          )}

          <Devices db={db} />
          <ReadingSettings />
          <Notifications db={db} />
          <Privacy db={db} />
        </>
      )}

      <SectionTitle>Sobre</SectionTitle>
      <div className="tile space-y-2 text-sm leading-relaxed text-muted">
        <p>Elo Saúde organiza seu histórico e indica quando procurar atendimento. Os alertas não são diagnóstico.</p>
        <p>
          Em emergência, ligue <a href="tel:192" className="font-medium text-danger underline underline-offset-4">192 (SAMU)</a>.
        </p>
      </div>
    </div>
  );
}

function ProfileHeader({ patient: p, editing, onEdit }: { patient: Patient; editing: boolean; onEdit: () => void }) {
  const initials = p.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  return (
    <section className="tile flex items-center gap-4">
      <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-xl font-medium text-ink">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-medium text-ink">{p.name || "Sem nome"}</p>
        <p className="text-sm text-muted">
          {p.birthDate ? `${ageFrom(p.birthDate)} anos` : "Idade não informada"}
          {p.bloodType ? ` · sangue ${p.bloodType}` : ""}
        </p>
      </div>
      {!editing && (
        <button type="button" className="btn-secondary shrink-0" onClick={onEdit}>
          Editar
        </button>
      )}
    </section>
  );
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex gap-3 py-3">
      <dt className={`w-32 shrink-0 font-medium ${danger ? "text-danger" : "text-muted"}`}>{label}</dt>
      <dd className="min-w-0 text-ink">{value}</dd>
    </div>
  );
}

function Devices({ db }: { db: Db }) {
  const names = db.devices.map((d) => d.name);
  return (
    <>
      <SectionTitle>Aparelhos e apps conectados</SectionTitle>
      <LinkCard
        href="/wearables"
        title={names.length ? names.join(", ") : "Nenhum aparelho conectado"}
        text="Relógios, anéis e medidores de pressão. Cada sinal aparece conforme o aparelho."
      />
    </>
  );
}

/** Qualidade da leitura dos laudos pela IA. A chave da IA é configurada pelo app, não pelo usuário. */
function ReadingSettings() {
  return (
    <>
      <SectionTitle id="qualidade">Qualidade da leitura</SectionTitle>
      <ReadingQuality />
    </>
  );
}

function Notifications({ db }: { db: Db }) {
  const notify = db.prefs?.notify ?? {};
  const topToast = db.prefs?.toast !== false;
  return (
    <>
      <SectionTitle>Avisos</SectionTitle>
      <div className="tile divide-y divide-line py-0">
        <div className="flex items-center gap-3 py-3">
          <div className="flex-1">
            <p className="text-[15px] font-medium text-ink" id="aviso-topo">Aviso no topo da tela</p>
            <p className="text-sm text-muted">Quando chega um alerta novo do relógio ou do medidor.</p>
          </div>
          <Switch aria-labelledby="aviso-topo" checked={topToast} onCheckedChange={(v) => updatePrefs((p) => { p.toast = v; })} />
        </div>
        {ALERT_PREFS.map((a) => {
          const on = a.locked || notify[a.kind] !== false;
          return (
            <div key={a.kind} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="text-[15px] text-ink" id={`aviso-${a.kind}`}>{a.label}</p>
                {a.locked && <p className="text-xs text-muted">Sempre ligado: pode indicar algo que precisa de médico.</p>}
              </div>
              <Switch
                aria-labelledby={`aviso-${a.kind}`}
                checked={on}
                disabled={a.locked}
                onCheckedChange={(v) => updatePrefs((p) => { p.notify = { ...p.notify, [a.kind]: v }; })}
              />
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Desligar um aviso não esconde o alerta da tela inicial nem da conversa.</p>
    </>
  );
}

function Privacy({ db }: { db: Db }) {
  const active = db.shares.filter((s) => shareState(s) === "ativo").length;
  return (
    <>
      <SectionTitle id="dados">Privacidade e dados</SectionTitle>
      {/* Cada item no seu cartão; apagar fica uma etapa adiante, em "Gerenciar meus dados" */}
      <div className="space-y-2">
        <LinkCard
          href="/acessos"
          title="Quem tem acesso"
          text={active ? `${active} ${active === 1 ? "acesso ativo" : "acessos ativos"}. Veja ou revogue.` : "Nenhum acesso ativo agora."}
        />
        <LinkCard href="/configuracoes/dados" title="Gerenciar meus dados" text="Levar para outro sistema, apagar a conversa ou apagar seus dados." />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Seu histórico fica salvo neste aparelho. Os laudos enviados são lidos por IA (Gemini, do Google) só para extrair os resultados.
      </p>
    </>
  );
}

function LinkCard({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="tile lift flex min-h-16 items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-ink">{title}</span>
        <span className="block text-sm text-muted">{text}</span>
      </span>
      <ChevronRight width={18} className="shrink-0 text-faint" />
    </Link>
  );
}
