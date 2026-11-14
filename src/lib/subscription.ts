"use client";

import { useSyncExternalStore } from "react";
import { addDays, daysBetween, todayISO } from "./dates";
import { CURRENT_PLAN, PERIODS, type BillingPeriod, type PlanId } from "./plans";

/**
 * Assinatura da conta (vale para todos os perfis do aparelho). Ainda sem
 * cobrança de verdade: pausar e cancelar ficam registrados aqui.
 * - Pausa: até 30 dias por período do plano, somando todas as pausas. Na pausa
 *   o app fica só para consulta (ver e exportar); enviar, conectar,
 *   compartilhar e conversar pedem retomar o plano. Retomou antes? Os dias
 *   usados contam no limite, e a renovação anda só o que ficou pausado.
 * - Cancelamento: a qualquer momento; o plano segue até o fim do período pago
 *   e depois a conta volta para o Gratuito. Nenhum dado é apagado.
 */

export const MAX_PAUSE_DAYS = 30;
const KEY = "elo-saude:assinatura";

export interface Subscription {
  plan: PlanId;
  period: BillingPeriod;
  status: "ativo" | "pausado" | "cancelado";
  /** Próxima renovação (ou fim do período pago, se cancelado). */
  renewsAt: string;
  pausedUntil?: string;
  pauseStartedAt?: string;
  /** Dias de pausa já usados neste período do plano (máximo de 30). */
  pauseUsedDays?: number;
  canceledAt?: string;
}

const listeners = new Set<() => void>();
let cache: Subscription | undefined;

function defaults(): Subscription {
  return { plan: CURRENT_PLAN, period: "anual", status: "ativo", renewsAt: addDays(todayISO(), 270) };
}

function read(): Subscription {
  let s: Subscription | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    s = raw ? (JSON.parse(raw) as Subscription) : null;
  } catch {
    s = null;
  }
  s ??= defaults();
  // A pausa termina sozinha na data marcada (os dias contam inteiros)
  if (s.status === "pausado" && s.pausedUntil && s.pausedUntil <= todayISO()) {
    const used = s.pauseStartedAt ? daysBetween(s.pauseStartedAt, s.pausedUntil) : 0;
    s = { ...s, status: "ativo", pausedUntil: undefined, pauseStartedAt: undefined, pauseUsedDays: Math.min(MAX_PAUSE_DAYS, (s.pauseUsedDays ?? 0) + used) };
  }
  return s;
}

function write(s: Subscription) {
  localStorage.setItem(KEY, JSON.stringify(s));
  cache = s;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      cache = undefined;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

function snapshot(): Subscription {
  cache ??= read();
  return cache;
}

/** Assinatura atual; null antes de abrir no navegador. */
export function useSubscription(): Subscription | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

/** Dias de pausa que ainda restam neste período do plano. */
export function pauseDaysLeft(s: Subscription): number {
  return Math.max(0, MAX_PAUSE_DAYS - (s.pauseUsedDays ?? 0));
}

/** true = plano pausado: o app fica só para consulta. */
export function isPaused(s: Subscription | null): boolean {
  return s?.status === "pausado";
}

export function pausePlan(days: number): Subscription {
  const s = snapshot();
  const d = Math.min(pauseDaysLeft(s), Math.max(1, Math.round(days)));
  if (d <= 0) return s;
  const today = todayISO();
  // O tempo pausado não é cobrado: a renovação anda junto
  const next: Subscription = { ...s, status: "pausado", pauseStartedAt: today, pausedUntil: addDays(today, d), renewsAt: addDays(s.renewsAt, d) };
  write(next);
  return next;
}

/** Retoma antes da data: conta só os dias que ficou pausado, e a renovação volta o que sobrou. */
export function resumePlan() {
  const s = snapshot();
  if (s.status !== "pausado" || !s.pausedUntil) return;
  const today = todayISO();
  const planned = s.pauseStartedAt ? daysBetween(s.pauseStartedAt, s.pausedUntil) : 0;
  // Cada pausa conta pelo menos 1 dia, para pausar e retomar não virar um atalho sem limite
  const used = s.pauseStartedAt ? Math.min(planned, Math.max(1, daysBetween(s.pauseStartedAt, today))) : 0;
  write({
    ...s,
    status: "ativo",
    pausedUntil: undefined,
    pauseStartedAt: undefined,
    pauseUsedDays: Math.min(MAX_PAUSE_DAYS, (s.pauseUsedDays ?? 0) + used),
    renewsAt: addDays(s.renewsAt, -(planned - used)),
  });
}

export function cancelPlan(): Subscription {
  if (snapshot().status === "pausado") resumePlan();
  const next: Subscription = { ...snapshot(), status: "cancelado", pausedUntil: undefined, pauseStartedAt: undefined, canceledAt: new Date().toISOString() };
  write(next);
  return next;
}

export function reactivatePlan() {
  write({ ...snapshot(), status: "ativo", canceledAt: undefined });
}

/** Troca de forma de pagamento ou de plano (sem cobrança nesta versão). */
export function changePlan(plan: PlanId, period: BillingPeriod) {
  const months = PERIODS.find((p) => p.id === period)!.months;
  write({ plan, period, status: "ativo", pauseUsedDays: 0, renewsAt: addDays(todayISO(), Math.round(months * 30.44)) });
}
