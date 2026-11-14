/**
 * Planos do Elo Saúde. Fonte única dos preços e limites mostrados no app.
 * Premissas de custo e margem: docs/MODELO-DE-NEGOCIO.md.
 */

export type PlanId = "gratuito" | "individual" | "familia";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** R$ por mês no plano mensal. */
  monthly: number;
  /** R$ por ano no plano anual. */
  yearly: number;
  /** R$ por 2 anos no plano de 2 anos. */
  biennial: number;
  profiles: number;
  features: string[];
  highlight?: string;
}

/**
 * Plano desta conta. Vários perfis no mesmo aparelho (a troca de perfil em
 * Configurações) é o plano Família; o Gratuito permite um perfil só.
 */
export const CURRENT_PLAN: PlanId = "familia";

export const FREE_LIMITS = {
  /** Laudos lidos por IA por mês. Digitar à mão é sempre livre. */
  aiReadsPerMonth: 5,
  chatPerMonth: 20,
  activeShares: 1,
  profiles: 1,
};

/**
 * Uso justo dos planos pagos: limites de pedidos à IA aplicados no servidor
 * (server/ai-proxy), por dia e por mês. Não aparecem para o usuário: ficam bem
 * acima do uso típico (cerca de 2 laudos e 30 perguntas por mês) e só barram
 * abuso. São os tetos de docs/modelo-de-negocio/modelo.py, em que a margem
 * continua positiva. No Família, valem para a conta, somando os perfis.
 * O Gratuito mostra os limites dele (fazem parte da oferta).
 */
export const FAIR_USE: Record<Exclude<PlanId, "gratuito">, { perDay: number; perMonth: number; firstImport: number }> = {
  individual: { perDay: 60, perMonth: 350, firstImport: 30 },
  familia: { perDay: 120, perMonth: 600, firstImport: 90 },
};

export const PLANS: Plan[] = [
  {
    id: "gratuito",
    name: "Gratuito",
    tagline: "Para conhecer o Elo com seus próprios exames.",
    monthly: 0,
    yearly: 0,
    biennial: 0,
    profiles: 1,
    features: [
      `${FREE_LIMITS.aiReadsPerMonth} laudos lidos por IA por mês (digitar à mão é livre)`,
      "Histórico, gráficos e alertas sem limite de tempo",
      `${FREE_LIMITS.chatPerMonth} perguntas ao Elo por mês`,
      `${FREE_LIMITS.activeShares} acesso de médico ativo por vez, por até 7 dias`,
      "Relógio: últimos 30 dias",
    ],
  },
  {
    id: "individual",
    name: "Individual",
    tagline: "Para uma pessoa. Quanto mais usa, mais completo fica.",
    monthly: 14.9,
    yearly: 149,
    biennial: 269,
    profiles: 1,
    features: [
      "Leitura de laudos por IA para o dia a dia, e a pasta de laudos antigos para montar o histórico",
      "Perguntas ao Elo e resumos para a consulta",
      "Médicos e hospitais sem limite, com prazos de até 1 ano",
      "Relógio e anel: todo o histórico e os avisos que juntam dados",
      "Resumo para a consulta e exportação em PDF, Excel e FHIR",
    ],
  },
  {
    id: "familia",
    name: "Família",
    tagline: "Uma pessoa cuida do histórico de até 5 pessoas da família.",
    monthly: 29.9,
    yearly: 299,
    biennial: 539,
    profiles: 5,
    highlight: "Para quem cuida dos pais e dos filhos",
    features: [
      "Tudo do Individual para até 5 perfis",
      "Troca de perfil com um toque, sem sair da conta",
      "Aviso para quem cuida quando chega um laudo novo ou um alerta",
      "Perfil com acesso próprio e modo simples (letra grande) para quem tem dificuldade",
      "Quando o filho fizer 18 anos, o perfil vira conta dele, com todo o histórico",
    ],
  },
];

export function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Desconto do anual sobre 12 meses do mensal, em meses inteiros. */
export function monthsFree(plan: Plan): number {
  if (!plan.monthly) return 0;
  return Math.round(12 - plan.yearly / plan.monthly);
}

/** Formas de contratar: mensal, 1 ano ou 2 anos. */
export type BillingPeriod = "mensal" | "anual" | "bienal";

export const PERIODS: { id: BillingPeriod; label: string; months: number }[] = [
  { id: "mensal", label: "Mensal", months: 1 },
  { id: "anual", label: "1 ano", months: 12 },
  { id: "bienal", label: "2 anos", months: 24 },
];

/** Preço total do período escolhido. */
export function periodPrice(plan: Plan, period: BillingPeriod): number {
  return period === "mensal" ? plan.monthly : period === "anual" ? plan.yearly : plan.biennial;
}

/** Quanto sai por mês no período escolhido. */
export function perMonth(plan: Plan, period: BillingPeriod): number {
  return periodPrice(plan, period) / (PERIODS.find((p) => p.id === period)!.months);
}

/** Economia (%) do período sobre pagar mês a mês. */
export function savingsPct(plan: Plan, period: BillingPeriod): number {
  if (!plan.monthly || period === "mensal") return 0;
  const months = PERIODS.find((p) => p.id === period)!.months;
  return Math.round((1 - periodPrice(plan, period) / (plan.monthly * months)) * 100);
}
