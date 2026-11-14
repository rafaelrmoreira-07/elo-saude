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

export const PLANS: Plan[] = [
  {
    id: "gratuito",
    name: "Gratuito",
    tagline: "Para conhecer o Elo com seus próprios exames.",
    monthly: 0,
    yearly: 0,
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
    tagline: "Uso sem limite para uma pessoa. Quanto mais usa, mais completo fica.",
    monthly: 14.9,
    yearly: 149,
    profiles: 1,
    features: [
      "Laudos lidos por IA sem limite, inclusive a pasta inteira de uma vez",
      "Perguntas ao Elo sem limite",
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
