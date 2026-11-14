"use client";

import Link from "next/link";
import { useState } from "react";
import { BackIcon, CheckIcon, ShieldIcon } from "@/components/icons";
import { PageHeader, SectionTitle } from "@/components/ui";
import { CURRENT_PLAN, FREE_LIMITS, PLANS, formatPrice, monthsFree, type Plan, type PlanId } from "@/lib/plans";
import { PERSONAS } from "@/lib/personas";
import { shareState } from "@/lib/share";
import { useDb } from "@/lib/store";
import type { Db } from "@/lib/types";

/** Plano atual da conta (vários perfis no aparelho = Família). */
const CURRENT: PlanId = CURRENT_PLAN;

export default function PlanosPage() {
  const db = useDb();
  const [yearly, setYearly] = useState(false);
  const [chosen, setChosen] = useState<PlanId | null>(null);

  return (
    <div>
      <Link href="/configuracoes" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-[15px] font-medium text-ink">
        <BackIcon width={20} /> Configurações
      </Link>
      <PageHeader title="Planos">
        Comece sem pagar. Assine quando o Elo já tiver o seu histórico. Se cancelar, nada é apagado: seus dados continuam seus.
      </PageHeader>

      {db && <Usage db={db} />}

      <div role="group" aria-label="Forma de pagamento" className="mt-5 inline-flex rounded-xl bg-surface p-1">
        <PeriodButton active={!yearly} onClick={() => setYearly(false)}>Mensal</PeriodButton>
        <PeriodButton active={yearly} onClick={() => setYearly(true)}>Anual · 2 meses grátis</PeriodButton>
      </div>

      <div className="mt-4 space-y-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            yearly={yearly}
            current={plan.id === CURRENT}
            chosen={chosen === plan.id}
            onChoose={() => setChosen(plan.id)}
          />
        ))}
      </div>

      <FamilyExplainer />

      <SectionTitle>Combinados</SectionTitle>
      <ul className="tile space-y-3 text-[15px] leading-relaxed text-ink">
        <Pledge>O Elo não vende seus dados. Quem paga o serviço é você, e depois hospitais e planos que quiserem receber o histórico com a sua autorização.</Pledge>
        <Pledge>Cancelou ou voltou para o Gratuito? Todo o histórico continua aqui para ver e exportar. Só a leitura por IA volta a ter limite.</Pledge>
        <Pledge>&quot;Sem limite&quot; vale para uso pessoal. Para evitar abuso, contas com volume fora do comum podem ter a leitura pausada por um dia.</Pledge>
      </ul>

      <SectionTitle>Para hospitais, clínicas e planos de saúde</SectionTitle>
      <div className="tile text-[15px] leading-relaxed text-muted">
        <p>
          Quando o paciente autoriza, a instituição recebe o histórico já organizado, com a origem de cada valor. Isso evita exame repetido e
          adianta a internação. <span className="font-medium text-ink">Em breve, com parceiros.</span>
        </p>
      </div>
    </div>
  );
}

function Usage({ db }: { db: Db }) {
  const plan = PLANS.find((p) => p.id === CURRENT)!;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const reads = db.documents.filter((d) => d.uploadedAt?.startsWith(month) && (d.extractedBy === "gemini" || d.extractedBy === "simulado")).length;
  const shares = db.shares.filter((s) => shareState(s) === "ativo").length;
  return (
    <section aria-labelledby="uso" className="tile mt-4">
      <h2 id="uso" className="text-[15px] font-medium text-ink">
        Seu plano: {plan.name}
      </h2>
      {plan.id === "gratuito" ? (
        <dl className="mt-3 space-y-3">
          <Meter label="Laudos lidos por IA neste mês" used={reads} total={FREE_LIMITS.aiReadsPerMonth} />
          <Meter label="Acessos de médico ativos" used={shares} total={FREE_LIMITS.activeShares} />
          <Meter label="Perfis" used={1} total={FREE_LIMITS.profiles} neutral />
        </dl>
      ) : (
        <>
          <dl className="mt-3 space-y-3">
            <Meter label="Perfis neste aparelho" used={PERSONAS.length} total={plan.profiles} neutral />
          </dl>
          <p className="mt-3 text-sm text-muted">
            Neste mês: {reads} {reads === 1 ? "laudo lido" : "laudos lidos"} por IA e {shares} {shares === 1 ? "acesso de médico ativo" : "acessos de médico ativos"}, sem limite.
          </p>
        </>
      )}
    </section>
  );
}

function Meter({ label, used, total, neutral }: { label: string; used: number; total: number; neutral?: boolean }) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  const over = !neutral && used >= total;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <dt className="text-muted">{label}</dt>
        <dd className={`num font-medium ${over ? "text-warn" : "text-ink"}`}>
          {used} de {total}
        </dd>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className={`h-full rounded-full ${over ? "bg-warn-mark" : "bg-ink"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PeriodButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-lg px-4 text-sm font-medium ${active ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function PlanCard({ plan, yearly, current, chosen, onChoose }: { plan: Plan; yearly: boolean; current: boolean; chosen: boolean; onChoose: () => void }) {
  const featured = Boolean(plan.highlight);
  const free = plan.monthly === 0;
  return (
    <article
      aria-labelledby={`plano-${plan.id}`}
      className={`flex flex-col rounded-2xl p-4 ${featured ? "border-2 border-accent bg-white" : "bg-surface"}`}
    >
      {plan.highlight && (
        <p className="mb-2 self-start rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-ink">{plan.highlight}</p>
      )}
      <h3 id={`plano-${plan.id}`} className="text-lg font-medium text-ink">
        {plan.name}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{plan.tagline}</p>

      <p className="mt-4">
        {free ? (
          <span className="big-num text-ink">R$ 0</span>
        ) : yearly ? (
          <>
            <span className="big-num text-ink">{formatPrice(plan.yearly)}</span>
            <span className="text-sm text-muted"> por ano</span>
            <span className="block text-xs text-muted">
              equivale a {formatPrice(plan.yearly / 12)} por mês · {monthsFree(plan)} meses grátis
            </span>
          </>
        ) : (
          <>
            <span className="big-num text-ink">{formatPrice(plan.monthly)}</span>
            <span className="text-sm text-muted"> por mês</span>
            {plan.profiles > 1 && (
              <span className="block text-xs text-muted">
                {formatPrice(plan.monthly / plan.profiles)} por pessoa com {plan.profiles} perfis
              </span>
            )}
          </>
        )}
      </p>

      <ul className="mt-4 flex-1 space-y-2.5 text-sm leading-relaxed text-ink">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <CheckIcon width={18} className="mt-0.5 shrink-0 text-ok" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {current ? (
          <p className="flex min-h-12 items-center justify-center rounded-xl border border-line text-[15px] font-medium text-muted">Seu plano atual</p>
        ) : (
          <button type="button" className={`${featured ? "btn-primary" : "btn-secondary"} w-full`} onClick={onChoose} aria-expanded={chosen}>
            Assinar o {plan.name}
          </button>
        )}
        {chosen && (
          <p role="status" className="mt-2 rounded-xl bg-navy-50 p-3 text-sm leading-relaxed text-ink">
            A assinatura abre em breve, com Pix ou cartão. Por enquanto, todos os recursos estão liberados para você.
          </p>
        )}
      </div>
    </article>
  );
}

const FAMILY = [
  { initials: "AM", name: "Ana", role: "Você · responsável pela conta", note: "Envia os laudos de todos e recebe os avisos." },
  { initials: "CM", name: "Carlos, 61", role: "Pai · perfil cuidado pela Ana", note: "Não precisa usar o app. Se quiser, entra no modo simples, de letra grande." },
  { initials: "SM", name: "Sofia, 8", role: "Filha · perfil de criança", note: "Vacinas e consultas do pediatra. Aos 18 anos, o perfil vira conta dela." },
];

function FamilyExplainer() {
  return (
    <>
      <SectionTitle>Como funciona o plano Família</SectionTitle>
      <div className="tile">
        <p className="text-[15px] leading-relaxed text-muted">
          Uma pessoa da família organiza tudo. Cada perfil tem o próprio histórico, separado dos outros, e a troca é feita em Configurações, tocando no nome.
        </p>
        <ul className="mt-4 space-y-2">
          {FAMILY.map((p, i) => (
            <li key={p.name} className={`flex items-start gap-3 rounded-xl p-3 ${i === 0 ? "bg-white ring-2 ring-accent" : "bg-white"}`}>
              <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-100 text-sm font-medium text-ink">
                {p.initials}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-medium text-ink">{p.name}</span>
                <span className="block text-sm text-muted">{p.role}</span>
                <span className="mt-1 block text-sm leading-relaxed text-ink">{p.note}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex gap-2 text-sm leading-relaxed text-muted">
          <ShieldIcon width={18} className="mt-0.5 shrink-0 text-ink" aria-hidden />
          <span>
            Adulto cuidado por outra pessoa autoriza esse cuidado e pode tirar a autorização quando quiser. O perfil de criança fica com o pai ou a
            mãe, como pede a LGPD.
          </span>
        </p>
      </div>
    </>
  );
}

function Pledge({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckIcon width={18} className="mt-1 shrink-0 text-ok" aria-hidden />
      <span>{children}</span>
    </li>
  );
}
