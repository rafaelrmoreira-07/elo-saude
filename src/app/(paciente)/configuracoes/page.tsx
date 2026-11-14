"use client";

import Link from "next/link";
import { useState } from "react";
import { Switch } from "@/components/base/switch";
import { ChevronRight } from "@/components/icons";
import { AppsSection, DevicesSection } from "@/components/Connections";
import { ProfileSettings } from "@/components/ProfileSettings";
import { Avatar, ProfileSwitcher } from "@/components/ProfileSwitcher";
import { ReadingQuality } from "@/components/ReadingQuality";
import { PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { ageFrom, formatDate } from "@/lib/dates";
import { shareState } from "@/lib/share";
import { asset } from "@/lib/paths";
import { PERSONAS } from "@/lib/personas";
import { PLANS } from "@/lib/plans";
import { useSubscription } from "@/lib/subscription";
import { setAiConsent, updatePrefs, useDb } from "@/lib/store";
import type { Db, HealthAlert } from "@/lib/types";

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
          <ProfileHeader db={db} editing={editing} onEdit={() => setEditing(true)} />

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

          <SectionTitle>Plano</SectionTitle>
          <PlanCard />

          <AiSettings db={db} />
          <AppsSection db={db} />
          <DevicesSection db={db} />
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

function ProfileHeader({ db, editing, onEdit }: { db: Db; editing: boolean; onEdit: () => void }) {
  const p = db.patient;
  return (
    <section className="tile flex items-center gap-3">
      <Avatar id={db.personaId ?? "carlos"} name={p.name || "Novo perfil"} />
      <div className="min-w-0 flex-1">
        <ProfileSwitcher db={db} />
        <p className="text-sm text-muted">
          {p.birthDate ? `${ageFrom(p.birthDate)} anos` : "Idade não informada"}
          {p.bloodType ? ` · sangue ${p.bloodType}` : ""}
        </p>
      </div>
      {!editing && (
        <button type="button" className="btn-quiet shrink-0 text-sm" onClick={onEdit}>
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

/** IA opcional: um interruptor para tudo o que usa a Gemini. Desligada, nada sai do aparelho para a IA. */
function AiSettings({ db }: { db: Db }) {
  const ia = db.consents?.ia !== false;
  return (
    <>
      <SectionTitle id="ia">Inteligência artificial</SectionTitle>
      <div className="tile">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[15px] font-medium text-ink" id="usar-ia">Usar IA</p>
            <p className="text-sm text-muted">{ia ? "Ligada" : "Desligada: nada vai para a IA"}</p>
          </div>
          <Switch aria-labelledby="usar-ia" aria-describedby="ia-detalhe" checked={ia} onCheckedChange={(v) => setAiConsent(v)} />
        </div>
        <div id="ia-detalhe" className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-muted">
          {ia ? (
            <>
              <p>A IA lê os laudos, responde na conversa e escreve o resumo para o médico. Nada é salvo sem você conferir.</p>
              <p className="mt-2">Laudos e mensagens vão para a IA do Google (Gemini), processada fora do Brasil. Na conversa, o seu nome é tirado antes do envio.</p>
            </>
          ) : (
            <>
              <p>O app continua funcionando: você preenche os valores dos laudos, a conversa responde pelos botões e o resumo para o médico é feito por regras.</p>
              <p className="mt-2">Pode ligar de novo quando quiser.</p>
            </>
          )}
        </div>
      </div>
      {ia && (
        <details className="group mt-2">
          <summary className="tile lift flex min-h-12 cursor-pointer list-none items-center gap-3 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex-1">Qualidade da leitura</span>
            <ChevronRight width={18} className="shrink-0 text-faint transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-2">
            <ReadingQuality />
          </div>
        </details>
      )}
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
          href="/configuracoes/#ia"
          title="Inteligência artificial"
          text={db.consents?.ia !== false ? "Ligada. Desligue quando quiser." : "Desligada: nada vai para a IA."}
        />
        <LinkCard
          href="/acessos"
          title="Quem tem acesso"
          text={active ? `${active} ${active === 1 ? "acesso ativo" : "acessos ativos"}. Veja ou revogue.` : "Nenhum acesso ativo agora."}
        />
        <LinkCard href="/configuracoes/dados" title="Gerenciar meus dados" text="Levar para outro sistema, apagar a conversa ou apagar seus dados." />
        <a href={asset("/privacidade.html")} target="_blank" rel="noopener" className="tile lift flex min-h-16 items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium text-ink">Política de privacidade</span>
            <span className="block text-sm text-muted">Quais dados, para quê, com quem e os seus direitos (LGPD).</span>
          </span>
          <ChevronRight width={18} className="shrink-0 text-faint" />
        </a>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Seu histórico fica salvo neste aparelho. Você pode ver, corrigir, levar para outro sistema e apagar seus dados quando quiser.
        {db.consents ? ` Consentimento registrado em ${formatDate(db.consents.healthAt.slice(0, 10))}.` : ""}
      </p>
    </>
  );
}

/** Plano da conta, com a situação (ativo, pausado ou cancelado). */
function PlanCard() {
  const sub = useSubscription();
  if (!sub) return null;
  const plan = PLANS.find((p) => p.id === sub.plan)!;
  const status =
    sub.status === "pausado"
      ? `Pausado até ${formatDate(sub.pausedUntil!)}`
      : sub.status === "cancelado"
        ? `Cancelado, ativo até ${formatDate(sub.renewsAt)}`
        : `Ativo · ${PERSONAS.length} de ${plan.profiles} ${plan.profiles === 1 ? "perfil" : "perfis"}`;
  return <LinkCard href="/planos" title={plan.name} text={`${status}. Pausar, cancelar ou mudar de plano.`} />;
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
