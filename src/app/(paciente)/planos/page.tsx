"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertIcon, BackIcon, CheckIcon, ShieldIcon } from "@/components/icons";
import { PageHeader, SectionTitle } from "@/components/ui";
import { addDays, formatDate, todayISO } from "@/lib/dates";
import { PERSONAS } from "@/lib/personas";
import { FREE_LIMITS, PERIODS, PLANS, formatPrice, perMonth, periodPrice, savingsPct, type BillingPeriod, type Plan, type PlanId } from "@/lib/plans";
import { shareState } from "@/lib/share";
import { useDb } from "@/lib/store";
import { cancelPlan, changePlan, MAX_PAUSE_DAYS, pauseDaysLeft, pausePlan, reactivatePlan, resumePlan, useSubscription, type Subscription } from "@/lib/subscription";
import type { Db } from "@/lib/types";

const PERIOD_TEXT: Record<BillingPeriod, string> = { mensal: "por mês", anual: "por ano", bienal: "a cada 2 anos" };

export default function PlanosPage() {
  const db = useDb();
  const sub = useSubscription();
  const [period, setPeriod] = useState<BillingPeriod>("anual");
  const [chosen, setChosen] = useState<PlanId | null>(null);
  const [cancelRequest, setCancelRequest] = useState(0);

  return (
    <div>
      <Link href="/configuracoes" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-[15px] font-medium text-ink">
        <BackIcon width={20} /> Configurações
      </Link>
      <PageHeader title="Planos">Seu plano, e o que muda em cada um. Se cancelar, nada é apagado: seus dados continuam seus.</PageHeader>

      {db && sub && <CurrentPlan db={db} sub={sub} cancelRequest={cancelRequest} />}

      <SectionTitle>Mudar de plano</SectionTitle>
      <div role="group" aria-label="Forma de pagamento" className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={period === p.id}
            onClick={() => setPeriod(p.id)}
            className={`min-h-11 rounded-lg px-2 text-sm font-medium leading-tight ${period === p.id ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {p.label}
            {p.id !== "mensal" && <span className="block text-xs font-normal text-ok">
                <span aria-hidden>até −{Math.max(...PLANS.map((pl) => savingsPct(pl, p.id)))}%</span>
                <span className="sr-only">, até {Math.max(...PLANS.map((pl) => savingsPct(pl, p.id)))}% a menos</span>
              </span>}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {PLANS.filter((p) => p.id !== sub?.plan).map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            period={period}
            chosen={chosen === plan.id}
            onChoose={() => {
              if (plan.id === "gratuito") {
                setCancelRequest((n) => n + 1);
                return;
              }
              setChosen(plan.id);
            }}
            onConfirm={() => {
              changePlan(plan.id, period);
              setChosen(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ))}
      </div>

      <FamilyExplainer />

      <SectionTitle>Combinados</SectionTitle>
      <ul className="tile space-y-3 text-[15px] leading-relaxed text-ink">
        <Pledge>Pause quando precisar, por até {MAX_PAUSE_DAYS} dias por período, somando as pausas. A cobrança para, o app fica só para consulta e o plano volta sozinho na data marcada.</Pledge>
        <Pledge>Cancele a qualquer momento, sem multa. O plano segue até o fim do período pago e depois a conta volta para o Gratuito.</Pledge>
        <Pledge>Cancelou ou voltou para o Gratuito? Todo o histórico continua aqui para ver e exportar. Só a leitura por IA volta a ter limite.</Pledge>
        <Pledge>O Elo não vende seus dados. Quem paga o serviço é você, e depois hospitais e planos que quiserem receber o histórico com a sua autorização.</Pledge>
        <Pledge>Os planos pagos seguem uma política de uso justo, só para evitar abuso: quem usa no dia a dia não chega perto dela. Digitar os valores à mão é sempre livre.</Pledge>
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

type Flow =
  | { kind: "none" }
  | { kind: "pause"; step: 1 | 2; days: number }
  | { kind: "cancel"; step: 1 | 2 }
  | { kind: "done"; message: "pausa" | "cancelamento" };

/** Plano atual em destaque no topo, com pausar e cancelar (aviso + segunda confirmação). */
function CurrentPlan({ db, sub, cancelRequest }: { db: Db; sub: Subscription; cancelRequest: number }) {
  const plan = PLANS.find((p) => p.id === sub.plan)!;
  const [flow, setFlow] = useState<Flow>({ kind: "none" });
  const panel = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLElement>(null);

  // "Mudar para o Gratuito" lá embaixo abre o cancelamento aqui
  useEffect(() => {
    if (!cancelRequest) return;
    queueMicrotask(() => setFlow({ kind: "cancel", step: 1 }));
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [cancelRequest]);

  // Leva o foco a cada etapa, para o leitor de tela anunciar o aviso
  useEffect(() => {
    if (flow.kind !== "none") panel.current?.focus();
  }, [flow]);

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const reads = db.documents.filter((d) => d.uploadedAt?.startsWith(month) && (d.extractedBy === "gemini" || d.extractedBy === "simulado")).length;
  const shares = db.shares.filter((s) => shareState(s) === "ativo").length;
  const free = plan.id === "gratuito";
  const left = pauseDaysLeft(sub);
  const options = [7, 15, 30].filter((d) => d < left).concat(left).filter((d, i, a) => d > 0 && a.indexOf(d) === i);

  const status =
    sub.status === "pausado"
      ? { text: `Pausado até ${formatDate(sub.pausedUntil!)}`, tone: "bg-warn-soft text-warn" }
      : sub.status === "cancelado"
        ? { text: `Cancelado · ativo até ${formatDate(sub.renewsAt)}`, tone: "bg-danger-soft text-danger" }
        : { text: "Ativo", tone: "bg-ok-soft text-ok" };

  return (
    <section ref={top} aria-labelledby="plano-atual" className="mt-2 scroll-mt-20 rounded-3xl border-2 border-ink bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Seu plano</p>
          <h2 id="plano-atual" className="mt-0.5 text-3xl font-normal tracking-[-0.03em] text-ink">{plan.name}</h2>
        </div>
        <span className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.tone}`}>{status.text}</span>
      </div>

      {!free && (
        <p className="num mt-2 text-[15px] text-ink">
          {formatPrice(periodPrice(plan, sub.period))} {PERIOD_TEXT[sub.period]}
          {sub.period !== "mensal" && <span className="text-muted"> · {formatPrice(perMonth(plan, sub.period))} por mês</span>}
        </p>
      )}
      {!free && sub.status === "ativo" && <p className="text-sm text-muted">Renova em {formatDate(sub.renewsAt)}.</p>}
      {sub.status === "pausado" && (
        <p className="text-sm text-muted">
          Sem cobrança na pausa, e o app fica só para consulta. Volta sozinho em {formatDate(sub.pausedUntil!)}; a renovação passou para {formatDate(sub.renewsAt)}.
        </p>
      )}
      {sub.status === "cancelado" && <p className="text-sm text-muted">Depois de {formatDate(sub.renewsAt)}, a conta volta para o Gratuito. Nenhum dado é apagado.</p>}

      <dl className="mt-4 space-y-3">
        <Meter label="Perfis neste aparelho" used={PERSONAS.length} total={plan.profiles} neutral={!free} />
        {free && <Meter label="Laudos lidos por IA neste mês" used={reads} total={FREE_LIMITS.aiReadsPerMonth} />}
        {free && <Meter label="Acessos de médico ativos" used={shares} total={FREE_LIMITS.activeShares} />}
      </dl>
      {!free && (
        <p className="mt-3 text-sm text-muted">
          Neste mês: {reads} {reads === 1 ? "laudo lido" : "laudos lidos"} por IA e {shares} {shares === 1 ? "acesso de médico ativo" : "acessos de médico ativos"}.
        </p>
      )}

      {!free && flow.kind === "none" && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {sub.status === "ativo" && (
            <>
              <button type="button" className="btn-secondary px-3" disabled={left === 0} onClick={() => setFlow({ kind: "pause", step: 1, days: Math.min(15, left) })}>Pausar plano</button>
              <button type="button" className="btn-danger px-3" onClick={() => setFlow({ kind: "cancel", step: 1 })}>Cancelar plano</button>
            </>
          )}
          {sub.status === "pausado" && (
            <>
              <button type="button" className="btn-primary px-3" onClick={resumePlan}>Retomar agora</button>
              <button type="button" className="btn-danger px-3" onClick={() => setFlow({ kind: "cancel", step: 1 })}>Cancelar plano</button>
            </>
          )}
          {sub.status === "cancelado" && (
            <button type="button" className="btn-primary col-span-2" onClick={reactivatePlan}>Reativar o {plan.name}</button>
          )}
        </div>
      )}

      {!free && flow.kind === "none" && sub.status === "ativo" && left === 0 && (
        <p className="mt-2 text-xs text-muted">Os {MAX_PAUSE_DAYS} dias de pausa deste período já foram usados. Eles voltam na renovação.</p>
      )}
      {!free && flow.kind === "none" && sub.status === "ativo" && left > 0 && left < MAX_PAUSE_DAYS && (
        <p className="mt-2 text-xs text-muted">Restam {left} {left === 1 ? "dia" : "dias"} de pausa neste período.</p>
      )}

      {flow.kind === "pause" && (
        <div ref={panel} tabIndex={-1} role="alert" className="mt-5 rounded-2xl bg-warn-soft p-4 outline-none">
          {flow.step === 1 ? (
            <>
              <p className="flex gap-2 text-[15px] font-medium text-ink">
                <AlertIcon width={20} className="mt-0.5 shrink-0 text-warn" /> Pausar o plano por até {MAX_PAUSE_DAYS} dias
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink">
                Na pausa, a cobrança para e o app fica só para consulta: não dá para enviar laudos, conectar apps, compartilhar com médicos nem conversar
                com o Elo. Ver e exportar o histórico continua liberado. Para usar, retome o plano; pode pausar de novo depois, e os dias já pausados contam no
                limite de {MAX_PAUSE_DAYS} por período. Restam {left} {left === 1 ? "dia" : "dias"}.
              </p>
              <fieldset className="mt-3">
                <legend className="label">Por quanto tempo?</legend>
                <div className="grid grid-cols-3 gap-2">
                  {options.map((d) => (
                    <label key={d} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-[15px] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${flow.days === d ? "border-ink bg-white font-medium text-ink" : "border-warn-line text-ink-soft"}`}>
                      <input type="radio" name="pausa" className="sr-only" checked={flow.days === d} onChange={() => setFlow({ ...flow, days: d })} />
                      {d} dias
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="btn-secondary" onClick={() => setFlow({ kind: "none" })}>Manter ativo</button>
                <button type="button" className="btn-primary" onClick={() => setFlow({ ...flow, step: 2 })}>Continuar</button>
              </div>
            </>
          ) : (
            <>
              <p className="flex gap-2 text-[15px] font-medium text-ink">
                <AlertIcon width={20} className="mt-0.5 shrink-0 text-warn" /> Confirma a pausa de {flow.days} dias?
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink">
                O {plan.name} fica pausado até {formatDate(addDays(todayISO(), flow.days))} e volta sozinho nessa data. Você pode retomar antes, quando quiser.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="btn-secondary" onClick={() => setFlow({ ...flow, step: 1 })}>Voltar</button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    pausePlan(flow.days);
                    setFlow({ kind: "done", message: "pausa" });
                  }}
                >
                  Confirmar pausa
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {flow.kind === "cancel" && (
        <div ref={panel} tabIndex={-1} role="alert" className="mt-5 rounded-2xl bg-danger-soft p-4 outline-none">
          {flow.step === 1 ? (
            <>
              <p className="flex gap-2 text-[15px] font-medium text-ink">
                <AlertIcon width={20} className="mt-0.5 shrink-0 text-danger" /> Cancelar o {plan.name}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink">Você pode cancelar a qualquer momento, sem multa. O que acontece:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink">
                <li>O plano segue ativo até {formatDate(sub.renewsAt)}. Depois, a conta volta para o Gratuito.</li>
                {plan.profiles > 1 && <li>No Gratuito, só 1 perfil fica em uso. Os outros ficam guardados para ver e exportar.</li>}
                <li>A leitura por IA volta a {FREE_LIMITS.aiReadsPerMonth} laudos por mês e os acessos de médico a {FREE_LIMITS.activeShares} por vez.</li>
                <li>Nenhum dado é apagado.</li>
              </ul>
              {sub.status !== "pausado" && <p className="mt-2 text-sm text-ink">Se for só por um tempo, dá para pausar por até {MAX_PAUSE_DAYS} dias em vez de cancelar.</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="btn-secondary" onClick={() => setFlow({ kind: "none" })}>Manter plano</button>
                <button type="button" className="btn-danger" onClick={() => setFlow({ kind: "cancel", step: 2 })}>Continuar</button>
              </div>
            </>
          ) : (
            <>
              <p className="flex gap-2 text-[15px] font-medium text-ink">
                <AlertIcon width={20} className="mt-0.5 shrink-0 text-danger" /> Tem certeza? Esta é a confirmação final.
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink">
                O {plan.name} será cancelado. Ele segue até {formatDate(sub.renewsAt)} e não será renovado.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="btn-secondary" onClick={() => setFlow({ kind: "cancel", step: 1 })}>Voltar</button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => {
                    cancelPlan();
                    setFlow({ kind: "done", message: "cancelamento" });
                  }}
                >
                  Sim, cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {flow.kind === "done" && (
        <div ref={panel} tabIndex={-1} role="status" className="mt-5 rounded-2xl bg-navy-50 p-4 outline-none">
          {flow.message === "pausa" ? (
            <>
              <p className="text-[15px] font-medium text-ink">Que pena que você precisou pausar.</p>
              <p className="mt-1 text-sm leading-relaxed text-ink">
                Esperamos que você volte logo! O plano volta sozinho em {formatDate(sub.pausedUntil ?? sub.renewsAt)}, ou antes, quando você tocar em Retomar.
              </p>
            </>
          ) : (
            <>
              <p className="text-[15px] font-medium text-ink">Obrigado por todo o tempo que você esteve com a gente.</p>
              <p className="mt-1 text-sm leading-relaxed text-ink">
                Esperamos que você volte! Seu plano segue ativo até {formatDate(sub.renewsAt)}, e o seu histórico continua aqui sempre que precisar.
              </p>
            </>
          )}
          <button type="button" className="btn-quiet mt-2 text-sm" onClick={() => setFlow({ kind: "none" })}>Fechar</button>
        </div>
      )}
    </section>
  );
}

function Meter({ label, used, total, neutral }: { label: string; used: number; total: number; neutral?: boolean }) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  const over = !neutral && used >= total;
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className={`num font-medium ${over ? "text-warn" : "text-ink"}`}>
        {used} de {total}
      </dd>
      <dd className="col-span-2 mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className={`h-full rounded-full ${over ? "bg-warn-mark" : "bg-ink"}`} style={{ width: `${pct}%` }} />
      </dd>
    </div>
  );
}

function PlanCard({ plan, period, chosen, onChoose, onConfirm }: { plan: Plan; period: BillingPeriod; chosen: boolean; onChoose: () => void; onConfirm: () => void }) {
  const featured = Boolean(plan.highlight);
  const free = plan.monthly === 0;
  const save = savingsPct(plan, period);
  const label = PERIODS.find((p) => p.id === period)!.label.toLowerCase();
  return (
    <article aria-labelledby={`plano-${plan.id}`} className={`flex flex-col rounded-2xl p-4 ${featured ? "border-2 border-accent bg-white" : "bg-surface"}`}>
      {plan.highlight && <p className="mb-2 self-start rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-ink">{plan.highlight}</p>}
      <h3 id={`plano-${plan.id}`} className="text-lg font-medium text-ink">
        {plan.name}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{plan.tagline}</p>

      <p className="mt-4">
        {free ? (
          <span className="big-num text-ink">R$ 0</span>
        ) : (
          <>
            <span className="big-num text-ink">{formatPrice(periodPrice(plan, period))}</span>
            <span className="text-sm text-muted"> {PERIOD_TEXT[period]}</span>
            {period !== "mensal" && (
              <span className="block text-xs text-muted">
                equivale a {formatPrice(perMonth(plan, period))} por mês{save > 0 ? ` · ${save}% a menos que o mensal` : ""}
              </span>
            )}
            {period === "mensal" && plan.profiles > 1 && (
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
        {!chosen ? (
          <button type="button" className={`${featured ? "btn-primary" : "btn-secondary"} w-full`} onClick={onChoose}>
            {free ? "Mudar para o Gratuito" : `Assinar o ${plan.name}`}
          </button>
        ) : (
          <div role="status" className="rounded-xl bg-navy-50 p-3 text-sm leading-relaxed text-ink">
            <p>
              {plan.name}, {label}: {formatPrice(periodPrice(plan, period))}. O pagamento por Pix ou cartão abre em breve; nesta versão, a troca vale na hora.
            </p>
            <button type="button" className="btn-primary mt-2 w-full" onClick={onConfirm}>
              Confirmar {plan.name} ({label})
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

const FAMILY = [
  { initials: "AM", name: "Ana", role: "Você · responsável pela conta", note: "Envia os laudos de todos e recebe os avisos." },
  { initials: "CM", name: "Carlos, 58", role: "Pai · perfil cuidado pela Ana", note: "Não precisa usar o app. Se quiser, entra no modo simples, de letra grande." },
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
