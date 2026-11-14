/**
 * Leitura do Apple Saúde (iPhone) e do Health Connect (Android) no app.
 * Junta as medições num registro por dia, no mesmo formato da importação de
 * arquivo, para as telas de Sinais, os alertas e o relatório do médico.
 *
 * O que cada central entrega pelo plugin:
 * - Batimento em repouso, variabilidade, sono, saturação, passos e pressão: as duas.
 * - Ritmo irregular e distúrbios respiratórios no sono: o plugin ainda não lê
 *   (ficam em branco; os alertas que dependem deles não disparam com esses dados).
 * - Variabilidade: o iPhone mede SDNN e o Android, RMSSD (cálculos diferentes).
 */
import type { HealthDataType, HealthSample } from "@capgo/capacitor-health";
import { classifySources, type Detected, type SourceSeen } from "./healthApps";
import { appPlatform, healthHubName } from "./native";
import type { WearableDay } from "./types";

export const HEALTH_TYPES: HealthDataType[] = ["restingHeartRate", "heartRateVariability", "sleep", "oxygenSaturation", "steps", "bloodPressure"];

/** Dias lidos a cada sincronização. */
export const SYNC_DAYS = 90;

async function plugin() {
  return (await import("@capgo/capacitor-health")).Health;
}

export class HealthSyncError extends Error {}

/** Se a central de saúde existe neste celular (no Android antigo, o Health Connect precisa ser instalado). */
export async function healthAvailable(): Promise<{ available: boolean; reason?: string }> {
  if (appPlatform() === "web") return { available: false, reason: "Disponível só no app de iPhone e Android." };
  try {
    const r = await (await plugin()).isAvailable();
    return { available: r.available, reason: r.reason };
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : undefined };
  }
}

/** Pede a permissão de leitura. Devolve os tipos liberados. */
export async function connectHealth(): Promise<HealthDataType[]> {
  const Health = await plugin();
  const { available, reason } = await healthAvailable();
  if (!available) {
    if (appPlatform() === "android") {
      try {
        await Health.openHealthConnectSettings();
      } catch {
        // sem tela de ajustes: segue para a mensagem
      }
    }
    throw new HealthSyncError(reason ?? `${healthHubName()} não está disponível neste celular.`);
  }
  const status = await Health.requestAuthorization({ read: HEALTH_TYPES, requestHistoryAccess: true });
  // No iPhone, por privacidade, o sistema não diz o que foi negado: tratamos tudo como pedido.
  return appPlatform() === "ios" ? HEALTH_TYPES : status.readAuthorized;
}

const dayOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Lê os últimos dias e devolve um registro por dia (só os dias com alguma
 * medição), mais os apps e aparelhos que gravaram esses dados na central.
 */
export async function readHealthDays(days = SYNC_DAYS): Promise<{ days: WearableDay[]; found: Detected }> {
  const Health = await plugin();
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  const range = { startDate: start.toISOString(), endDate: end.toISOString() };

  const byDay = new Map<string, WearableDay>();
  const day = (date: string) => {
    let d = byDay.get(date);
    if (!d) {
      d = { date, restingHr: null, hrvMs: null, sleepHours: null, spo2Min: null, breathingDisturbances: null, steps: null, irregularRhythmEvents: null, systolic: null, diastolic: null };
      byDay.set(date, d);
    }
    return d;
  };
  const read = async (dataType: HealthDataType): Promise<HealthSample[]> => {
    try {
      return (await Health.readSamples({ dataType, ...range, limit: 10_000, ascending: true })).samples;
    } catch {
      return []; // tipo sem permissão ou sem dados
    }
  };
  const avgInto = (samples: HealthSample[], key: "restingHr" | "hrvMs", digits = 0) => {
    const acc = new Map<string, number[]>();
    for (const s of samples) acc.set(dayOf(s.startDate), [...(acc.get(dayOf(s.startDate)) ?? []), s.value]);
    for (const [date, vals] of acc) {
      const f = 10 ** digits;
      day(date)[key] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * f) / f;
    }
  };

  // Passos: soma por dia (agregado pela própria central, sem contar em dobro relógio + celular)
  try {
    const agg = await Health.queryAggregated({ dataType: "steps", ...range, bucket: "day", aggregation: "sum" });
    for (const b of agg.samples) if (b.value > 0) day(dayOf(b.startDate)).steps = Math.round(b.value);
  } catch {
    // sem permissão de passos
  }

  const [rhr, hrv, spo2, bp, sleep] = await Promise.all([read("restingHeartRate"), read("heartRateVariability"), read("oxygenSaturation"), read("bloodPressure"), read("sleep")]);

  // Quem gravou cada dado (app e, quando a central informa, o aparelho)
  const sources = new Map<string, SourceSeen>();
  const seen = (samples: HealthSample[], metric: string) => {
    for (const s of samples) {
      if (!s.sourceName && !s.sourceId) continue;
      const key = `${s.sourceId ?? ""}|${s.sourceName ?? ""}|${s.deviceType ?? ""}`;
      const cur = sources.get(key) ?? { name: s.sourceName ?? s.sourceId ?? "", id: s.sourceId, deviceType: s.deviceType, metrics: new Set<string>() };
      cur.metrics.add(metric);
      sources.set(key, cur);
    }
  };
  seen(rhr, "Batimentos em repouso");
  seen(hrv, "Variabilidade cardíaca");
  seen(spo2, "Saturação");
  seen(bp, "Pressão arterial");
  seen(sleep, "Sono");
  avgInto(rhr, "restingHr");
  avgInto(hrv, "hrvMs");

  // Saturação: menor valor do dia, em % (alguns aparelhos mandam 0,95)
  for (const s of spo2) {
    const v = s.value <= 1 ? s.value * 100 : s.value;
    const d = day(dayOf(s.startDate));
    d.spo2Min = d.spo2Min == null ? Math.round(v) : Math.min(d.spo2Min, Math.round(v));
  }

  // Pressão: média do dia
  const bpAcc = new Map<string, { s: number[]; d: number[] }>();
  for (const s of bp) {
    if (s.systolic == null || s.diastolic == null) continue;
    const k = dayOf(s.startDate);
    const a = bpAcc.get(k) ?? { s: [], d: [] };
    a.s.push(s.systolic);
    a.d.push(s.diastolic);
    bpAcc.set(k, a);
  }
  for (const [k, a] of bpAcc) {
    day(k).systolic = Math.round(a.s.reduce((x, y) => x + y, 0) / a.s.length);
    day(k).diastolic = Math.round(a.d.reduce((x, y) => x + y, 0) / a.d.length);
  }

  // Sono: horas dormidas na noite que termina naquele dia (sem "na cama" e "acordado")
  const asleep = new Map<string, number>();
  for (const s of sleep) {
    const minutes = s.stages?.length
      ? s.stages.filter((st) => st.stage !== "awake" && st.stage !== "inBed").reduce((a, st) => a + st.durationMinutes, 0)
      : s.sleepState && s.sleepState !== "awake" && s.sleepState !== "inBed"
        ? (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60_000
        : 0;
    if (minutes > 0) asleep.set(dayOf(s.endDate), (asleep.get(dayOf(s.endDate)) ?? 0) + minutes);
  }
  for (const [k, m] of asleep) day(k).sleepHours = Math.round((m / 60) * 10) / 10;

  const platform = appPlatform() === "android" ? "android" : "ios";
  return { days: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)), found: classifySources([...sources.values()], platform) };
}
