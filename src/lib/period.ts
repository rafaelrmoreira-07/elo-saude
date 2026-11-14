/**
 * Período de datas escolhido pela pessoa: filtra a linha do tempo, os gráficos
 * e o que vai no link para o médico. Datas ISO "YYYY-MM-DD"; ponta vazia = sem limite.
 */
import { addDays, formatDate, isValidISODate, todayISO } from "./dates";

export interface Period {
  from?: string;
  to?: string;
}

export type PeriodPreset = "tudo" | "12m" | "24m" | "personalizado";

export const PERIOD_PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "tudo", label: "Tudo" },
  { key: "12m", label: "12 meses" },
  { key: "24m", label: "2 anos" },
  { key: "personalizado", label: "Escolher" },
];

export function presetPeriod(p: PeriodPreset, today = todayISO()): Period {
  if (p === "12m") return { from: addDays(today, -365) };
  if (p === "24m") return { from: addDays(today, -730) };
  return {};
}

export function inPeriod(date: string, p?: Period | null): boolean {
  if (!p) return true;
  const d = date.slice(0, 10);
  return (!p.from || d >= p.from) && (!p.to || d <= p.to);
}

/** Remédio entra se esteve em uso em algum momento do período. */
export function medInPeriod(m: { startDate: string; endDate?: string | null }, p?: Period | null): boolean {
  if (!p) return true;
  const end = m.endDate ?? todayISO();
  return (!p.to || m.startDate <= p.to) && (!p.from || end >= p.from);
}

/** Período válido e sem pontas invertidas; vazio vira undefined. */
export function cleanPeriod(p?: Period | null): Period | undefined {
  if (!p) return undefined;
  const from = p.from && isValidISODate(p.from) ? p.from : undefined;
  const to = p.to && isValidISODate(p.to) ? p.to : undefined;
  if (!from && !to) return undefined;
  if (from && to && from > to) return { from: to, to: from };
  return { from, to };
}

export function periodLabel(p?: Period | null): string {
  if (!p || (!p.from && !p.to)) return "Todo o histórico";
  if (p.from && p.to) return `De ${formatDate(p.from)} a ${formatDate(p.to)}`;
  if (p.from) return `Desde ${formatDate(p.from)}`;
  return `Até ${formatDate(p.to!)}`;
}
