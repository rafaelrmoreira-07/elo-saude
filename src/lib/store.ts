"use client";

import { useSyncExternalStore } from "react";
import { analyteInfo, resolveAnalyteKey } from "./analytes";
import { resetChat } from "./chat";
import { addDays, isValidISODate, todayISO } from "./dates";
import { cleanPeriod } from "./period";
import { createPersonaDb, personaWearables } from "./personas";
import { extendWearablesToToday } from "./seed";
import { simulatedDischarge } from "./admission";
import { newAccessCode } from "./shareCrypto";
import { appRef, CENTRAL_ID, mergeAppDays, personaConnections, type Detected } from "./healthApps";
import { SCOPES, type Admission, type CheckInSymptom, type Db, type DescriptiveReport, type DoctorSummary, type ExtractedResult, type ExtractionSource, type PersonaId, type Scope, type ShareKind, type DeviceKind, type HealthApp, type WearableDay, type WearableDevice } from "./types";
import { MAX_IMPORT_DAYS, METRIC_LABELS, type ImportResult } from "./wearableImport";

/**
 * Armazenamento da versão web: tudo fica no navegador da pessoa.
 * - Histórico estruturado: localStorage (JSON).
 * - Arquivos originais dos laudos: IndexedDB.
 * Abas e iframes do mesmo site ficam sincronizados pelo evento "storage".
 */

const DB_KEY = "elo-saude:db:v1";
const listeners = new Set<() => void>();
let cache: Db | undefined;

function read(): Db {
  const raw = localStorage.getItem(DB_KEY);
  let db: Db | null = null;
  if (raw) {
    try {
      db = JSON.parse(raw) as Db;
    } catch {
      db = null;
    }
  }
  if (db?.devices?.some((d) => d.name.includes(" (simulado)"))) {
    // Bancos salvos antes de 14/11 traziam "(simulado)" no nome do aparelho
    db.devices = db.devices.map((d) => ({ ...d, name: d.name.replace(" (simulado)", "") }));
    write(db);
  }
  if (!db || db.version !== 1) {
    db = createPersonaDb("nova"); // primeiro acesso: app vazio, com o guia de boas-vindas
    ensureConnections(db);
    write(db);
  } else {
    let changed = ensureConnections(db); // bancos de antes da separação entre apps e aparelhos
    // Só a simulação é estendida até hoje; dado importado fica como veio do arquivo.
    if (db.wearableSource?.kind !== "importado" && extendWearablesToToday(db, new Date(), personaWearables(db.personaId))) changed = true;
    if (changed) write(db);
  }
  return db;
}

/** Versão da política de privacidade (public/privacidade.html). */
export const POLICY_VERSION = "2026-11-14";
/** Espelho do consentimento da IA, lido pelo cliente da Gemini sem abrir o banco inteiro. */
export const AI_CONSENT_KEY = "elo-saude:ia-consent";

function write(db: Db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  if (db.consents?.ia === false) localStorage.setItem(AI_CONSENT_KEY, "nao");
  else localStorage.removeItem(AI_CONSENT_KEY);
}

function notify() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === DB_KEY || e.key === null) {
      cache = undefined;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getDbSnapshot(): Db {
  cache ??= read();
  return cache;
}

/** Histórico atual; null durante a pré-renderização (antes de abrir no navegador). */
export function useDb(): Db | null {
  return useSyncExternalStore(subscribe, getDbSnapshot, () => null);
}

function update<T>(mutate: (db: Db) => T): T {
  const db = structuredClone(getDbSnapshot());
  const result = mutate(db);
  write(db);
  cache = db;
  notify();
  return result;
}

// ---------- arquivos (IndexedDB) ----------

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("elo-saude-arquivos", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbRun<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction("files", mode).objectStore("files"));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getDocumentFile(id: string): Promise<Blob | undefined> {
  try {
    return await idbRun<Blob | undefined>("readonly", (s) => s.get(id));
  } catch {
    return undefined;
  }
}

/** Abre o laudo original numa nova aba. */
export async function openDocumentFile(id: string) {
  const win = window.open("", "_blank");
  const blob = await getDocumentFile(id);
  if (!blob) {
    win?.close();
    alert("O arquivo original deste laudo não está salvo neste navegador.");
    return;
  }
  const url = URL.createObjectURL(blob);
  if (win) win.location.href = url;
  else window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---------- mutações ----------

export interface SaveExamInput {
  file: File;
  extractedBy: ExtractionSource;
  model?: string;
  lab: string;
  examDate: string;
  results: {
    name: string;
    analyteKey: string;
    value: number | null;
    valueText?: string | null;
    unit: string;
    refLow: number | null;
    refHigh: number | null;
    refText?: string | null;
    review?: "corrigido" | "adicionado";
  }[];
  /** Laudo descritivo (imagem, coração, endoscopia): salva sem tabela de resultados. */
  report?: DescriptiveReport | null;
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const finite = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

const REPORT_CATEGORIES = ["imagem", "cardiologico", "endoscopia", "outro"] as const;

function cleanReport(r: DescriptiveReport): DescriptiveReport | null {
  const examName = clean(r.examName, 120);
  const conclusion = clean(r.conclusion, 1200);
  if (!examName || !conclusion) return null;
  return {
    examName,
    category: REPORT_CATEGORIES.includes(r.category) ? r.category : "outro",
    conclusion,
    findings: clean(r.findings, 1200) || undefined,
    physician: clean(r.physician, 120) || undefined,
  };
}

export async function saveExam(input: SaveExamInput): Promise<{ error: string } | { docId: string }> {
  if (!isValidISODate(input.examDate) || input.examDate > todayISO()) return { error: "Informe uma data de coleta válida." };
  const results = input.results
    .slice(0, 80)
    .filter((r) => clean(r.name, 120) && (finite(r.value) != null || clean(r.valueText, 80)));
  const report = input.report ? cleanReport(input.report) : null;
  if (input.report && !report) return { error: "Informe o nome do exame e a conclusão do laudo." };
  if (!results.length && !report) return { error: "Nenhum resultado para salvar." };

  const docId = crypto.randomUUID();
  let stored = false;
  try {
    await idbRun("readwrite", (s) => s.put(input.file, docId));
    stored = true;
  } catch {
    // sem IndexedDB (ex.: navegação privada): salva os dados sem o original
  }
  const lab = clean(input.lab, 120) || undefined;
  update((db) => {
    db.documents.push({
      id: docId,
      filename: clean(input.file.name, 160) || "laudo",
      mimeType: clean(input.file.type, 60),
      storedAs: stored ? docId : undefined,
      uploadedAt: new Date().toISOString(),
      examDate: input.examDate,
      lab,
      extractedBy: input.extractedBy === "gemini" ? "gemini" : input.extractedBy === "simulado" ? "simulado" : "manual",
      model: clean(input.model, 60) || undefined,
      report: report ?? undefined,
    });
    for (const r of results) {
      const name = clean(r.name, 120);
      const key = resolveAnalyteKey(clean(r.analyteKey, 60), name);
      db.labResults.push({
        id: crypto.randomUUID(),
        documentId: docId,
        analyteKey: key,
        name,
        value: finite(r.value),
        valueText: clean(r.valueText, 80) || undefined,
        unit: clean(r.unit, 30) || analyteInfo(key)?.unit || "",
        refLow: finite(r.refLow),
        refHigh: finite(r.refHigh),
        refText: clean(r.refText, 160) || undefined,
        date: input.examDate,
        lab,
        review: r.review === "corrigido" || r.review === "adicionado" ? r.review : undefined,
      });
    }
  });
  return { docId };
}

/**
 * Salva os dias importados de um arquivo do relógio. A primeira importação
 * substitui a simulação; as seguintes se juntam às anteriores (o dia mais novo
 * vale), mantendo os últimos 180 dias.
 */
// ---------- apps e aparelhos conectados ----------

const nowIso = () => new Date().toISOString();

/**
 * Cria a lista de apps em bancos antigos e nas personas: o "aparelho" que na
 * verdade era o app de origem vira app, e cada aparelho fica ligado a um app.
 * Devolve true se mudou algo.
 */
function ensureConnections(db: Db): boolean {
  if (db.apps) return false;
  const src = db.wearableSource;
  if (src?.kind === "importado") {
    const legacy = db.devices.find((d) => d.kind === "importado");
    const ref = src.connected ? { id: CENTRAL_ID[src.connected], name: src.connected === "ios" ? "Apple Saúde" : "Health Connect", kind: "central" as const } : appRef(src.label ?? "Arquivo importado");
    const at = src.importedAt ?? legacy?.connectedAt ?? nowIso();
    db.apps = [
      {
        ...ref,
        via: src.connected ? "conexao" : "arquivo",
        platform: src.connected,
        metrics: legacy?.metrics ?? [],
        connectedAt: legacy?.connectedAt ?? at,
        lastSyncAt: at,
        filename: src.filename,
        readBy: src.readBy,
      },
    ];
    db.devices = db.devices.filter((d) => d.kind !== "importado");
    db.appDays = { [ref.id]: db.wearableDays };
    return true;
  }
  const pc = personaConnections(db.personaId, db.devices[0]?.connectedAt ?? db.createdAt);
  db.apps = db.wearableDays.length ? pc.apps : [];
  db.devices = db.devices.map((d) => ({ ...d, ...pc.devices[d.id] }));
  return true;
}

/** Passa a guardar os dias por app (para poder apagar só os de um app). Os dias atuais ficam com o app principal. */
function ensureAppDays(db: Db): Record<string, WearableDay[]> {
  if (!db.appDays) {
    const owner = db.apps?.find((a) => !a.through)?.id ?? "anterior";
    db.appDays = db.wearableDays.length ? { [owner]: db.wearableDays } : {};
  }
  return db.appDays;
}

function rebuildDays(db: Db) {
  const all = mergeAppDays(db.apps ?? [], ensureAppDays(db));
  if (!all.length) {
    db.wearableDays = [];
    return;
  }
  const cutoff = addDays(all.at(-1)!.date, -(MAX_IMPORT_DAYS - 1));
  db.wearableDays = all.filter((d) => d.date >= cutoff);
}

function upsertApp(db: Db, app: HealthApp) {
  const apps = (db.apps ??= []);
  const i = apps.findIndex((a) => a.id === app.id);
  if (i < 0) apps.push(app);
  else apps[i] = { ...apps[i], ...app, connectedAt: apps[i].connectedAt, metrics: [...new Set([...apps[i].metrics, ...app.metrics])] };
}

/** Aparelhos encontrados nos dados entram ligados ao app; os cadastrados pela pessoa ficam como estão. */
function upsertDetected(db: Db, found: Detected, through: string | null) {
  const at = nowIso();
  for (const a of found.apps) {
    if (a.id === through) continue;
    upsertApp(db, { ...a, via: through ? db.apps?.find((x) => x.id === through)?.via ?? "arquivo" : "arquivo", through: through ?? undefined, connectedAt: at, lastSyncAt: at });
  }
  for (const d of found.devices) {
    const cur = db.devices.find((x) => x.id === d.id);
    if (cur) Object.assign(cur, { appId: cur.appId ?? d.appId, metrics: [...new Set([...cur.metrics, ...d.metrics])] });
    else db.devices.push({ ...d, connectedAt: at, detected: true });
  }
}

function mergeInto(prev: WearableDay[] | undefined, next: WearableDay[]): WearableDay[] {
  const m = new Map((prev ?? []).map((d) => [d.date, d]));
  for (const d of next) m.set(d.date, d);
  return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Salva um arquivo importado como dados de um app (o que a pessoa escolheu na
 * revisão: Samsung Health, um app de saúde com IA etc.).
 */
export function importWearables(res: ImportResult, app: Pick<HealthApp, "id" | "name" | "kind">, found?: Detected) {
  update((db) => {
    const at = nowIso();
    const days = ensureAppDays(db);
    days[app.id] = mergeInto(days[app.id], res.days);
    upsertApp(db, { ...app, via: "arquivo", metrics: res.metrics.map((k) => METRIC_LABELS[k].name), connectedAt: at, lastSyncAt: at, filename: res.source.filename, readBy: res.source.readBy });
    if (found) upsertDetected(db, found, app.id);
    rebuildDays(db);
    db.wearableSource = { kind: "importado", label: app.name, filename: res.source.filename, readBy: res.source.readBy, importedAt: at };
  });
}

/**
 * App de iPhone e Android: salva os dias lidos do Apple Saúde ou do Health
 * Connect, e os apps e aparelhos que gravaram esses dados.
 */
export function saveConnectedWearables(days: WearableDay[], platform: "ios" | "android", found?: Detected): number {
  if (!days.length) return 0;
  const id = CENTRAL_ID[platform];
  const label = platform === "ios" ? "Apple Saúde" : "Health Connect";
  const has = (k: keyof WearableDay) => days.some((d) => d[k] != null);
  const metrics = [
    has("restingHr") && "Batimentos em repouso",
    has("hrvMs") && "Variabilidade cardíaca",
    has("sleepHours") && "Sono",
    has("spo2Min") && "Saturação",
    has("steps") && "Passos",
    has("systolic") && "Pressão arterial",
  ].filter((x): x is string => Boolean(x));
  update((db) => {
    const at = nowIso();
    const byApp = ensureAppDays(db);
    byApp[id] = mergeInto(byApp[id], days);
    upsertApp(db, { id, name: label, kind: "central", via: "conexao", platform, metrics, connectedAt: at, lastSyncAt: at });
    if (found) upsertDetected(db, found, id);
    rebuildDays(db);
    db.wearableSource = { kind: "importado", label, readBy: "direto", connected: platform, importedAt: at };
  });
  return days.length;
}

/**
 * Desconecta um app (e os que chegam por ele). Os aparelhos encontrados nos
 * dados dele saem junto; os cadastrados pela pessoa ficam, sem app.
 * Com deleteData, apaga também os dias que vieram dele.
 */
export function disconnectApp(id: string, deleteData: boolean) {
  update((db) => {
    const gone = new Set([id, ...(db.apps ?? []).filter((a) => a.through === id).map((a) => a.id)]);
    if (deleteData) {
      const byApp = ensureAppDays(db);
      for (const g of gone) delete byApp[g];
    }
    db.apps = (db.apps ?? []).filter((a) => !gone.has(a.id));
    db.devices = db.devices.filter((d) => !(d.detected && d.appId && gone.has(d.appId))).map((d) => (d.appId && gone.has(d.appId) ? { ...d, appId: undefined } : d));
    if (deleteData) rebuildDays(db);
    const src = db.wearableSource;
    if (src?.connected && CENTRAL_ID[src.connected] === id) db.wearableSource = { ...src, connected: undefined };
    if (deleteData && !db.wearableDays.length) db.wearableSource = { kind: "importado", label: "Nenhum app" };
  });
}

/** Cadastra um aparelho à mão e diz por qual app os dados dele chegam. */
export function addDevice(input: { name: string; kind: DeviceKind; appId?: string }): WearableDevice {
  const dev: WearableDevice = { id: `dev-${crypto.randomUUID().slice(0, 8)}`, name: input.name.trim(), kind: input.kind, appId: input.appId || undefined, metrics: [], connectedAt: nowIso(), detected: false };
  update((db) => {
    db.devices.push(dev);
  });
  return dev;
}

export function updateDevice(id: string, patch: Partial<Pick<WearableDevice, "name" | "kind" | "appId">>) {
  update((db) => {
    const d = db.devices.find((x) => x.id === id);
    if (d) Object.assign(d, patch);
  });
}

export function removeDevice(id: string) {
  update((db) => {
    db.devices = db.devices.filter((d) => d.id !== id);
  });
}

/** Completa à mão um valor que ficou "não lido" na leitura do laudo. */
export function fillLabValue(id: string, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  return update((db) => {
    const r = db.labResults.find((x) => x.id === id);
    if (!r) return false;
    r.value = value;
    r.valueText = undefined;
    r.review = "adicionado";
    return true;
  });
}

/** Consentimentos do cadastro (LGPD). */
export function saveConsents(ia: boolean) {
  update((db) => {
    const at = nowIso();
    db.consents = { policyVersion: POLICY_VERSION, healthAt: db.consents?.healthAt ?? at, ia, iaAt: at };
  });
  window.dispatchEvent(new Event("elo-saude:gemini-key"));
}

/** Liga ou desliga a leitura pela IA (Configurações › Privacidade). Revogar vale na hora. */
export function setAiConsent(ia: boolean) {
  update((db) => {
    const at = nowIso();
    db.consents = { policyVersion: db.consents?.policyVersion ?? POLICY_VERSION, healthAt: db.consents?.healthAt ?? at, ia, iaAt: at };
  });
  window.dispatchEvent(new Event("elo-saude:gemini-key"));
}

/** Cadastro do guia de boas-vindas e edição do perfil em Configurações. */
export function saveProfile(profile: {
  name: string;
  birthDate: string;
  sex: "F" | "M";
  allergies: string[];
  bloodType?: string;
  emergencyContact?: { name: string; phone: string } | null;
}) {
  update((db) => {
    const { emergencyContact, bloodType, ...rest } = profile;
    db.patient = { ...db.patient, ...rest };
    if (bloodType !== undefined) db.patient.bloodType = clean(bloodType, 5) || undefined;
    if (emergencyContact !== undefined) {
      const name = clean(emergencyContact?.name, 80);
      const phone = clean(emergencyContact?.phone, 30);
      db.patient.emergencyContact = name && phone ? { name, phone } : undefined;
    }
  });
}

/** Preferências de avisos em Configurações. */
export function updatePrefs(mutate: (prefs: NonNullable<Db["prefs"]>) => void) {
  update((db) => {
    db.prefs = { ...db.prefs };
    mutate(db.prefs);
  });
}

/** Volta aos dados iniciais da persona atual (ou troca para outra persona). */
export async function resetDemo(persona?: PersonaId) {
  update((db) => {
    const id = persona ?? db.personaId ?? "carlos";
    for (const k of Object.keys(db)) delete (db as unknown as Record<string, unknown>)[k];
    Object.assign(db, createPersonaDb(id));
    ensureConnections(db);
  });
  resetChat();
  try {
    await idbRun("readwrite", (s) => s.clear());
  } catch {
    // nada a limpar
  }
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createShare(form: {
  doctorName: string;
  doctorCrm?: string;
  scopes: string[];
  hours: number;
  kind?: ShareKind;
  admissionId?: string;
  evidenceConsent?: boolean;
  period?: { from?: string; to?: string };
}): { error: string } | { token: string } {
  const doctorName = clean(form.doctorName, 100);
  const doctorCrm = clean(form.doctorCrm, 30) || undefined;
  const scopes = form.scopes.filter((s): s is Scope => SCOPES.includes(s as Scope));
  if (!doctorName) return { error: form.kind === "hospital" ? "Informe o nome do hospital." : "Informe o nome do médico." };
  if (!scopes.length) return { error: "Escolha pelo menos um tipo de dado para compartilhar." };
  if (![1, 24, 168, 720, 2160, 8760].includes(form.hours)) return { error: "Prazo inválido." };

  const token = newToken();
  const now = new Date();
  update((db) => {
    // Apêndice B: quantos resultados dos últimos 90 dias vão no relatório
    const since = addDays(todayISO(), -90);
    const recentShown = scopes.includes("exames") && form.kind !== "hospital" ? db.labResults.filter((r) => r.date >= since).length : undefined;
    db.shares.unshift({
      token,
      doctorName,
      doctorCrm,
      scopes,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + form.hours * 3_600_000).toISOString(),
      revokedAt: null,
      accessCode: newAccessCode(),
      accessLog: [],
      kind: form.kind ?? "medico",
      admissionId: form.admissionId,
      evidenceConsent: form.kind === "hospital" ? Boolean(form.evidenceConsent) : undefined,
      recentShown,
      period: cleanPeriod(form.period),
    });
  });
  return { token };
}

export function revokeShare(token: string) {
  update((db) => {
    const s = db.shares.find((x) => x.token === token);
    if (s && !s.revokedAt) s.revokedAt = new Date().toISOString();
  });
}

/** Registra a abertura da visão do médico. Recarregar em menos de 1 min conta como o mesmo acesso. */
export function logAccess(token: string, userAgent?: string) {
  const db = getDbSnapshot();
  const s = db.shares.find((x) => x.token === token);
  const last = s?.accessLog.at(-1);
  const now = Date.now();
  if (!s || (last && last.userAgent === userAgent && now - new Date(last.at).getTime() < 60_000)) return;
  update((d) => {
    d.shares.find((x) => x.token === token)?.accessLog.push({ at: new Date(now).toISOString(), userAgent: userAgent?.slice(0, 200) });
  });
}

export function cacheSummary(token: string, hash: string, summary: DoctorSummary) {
  update((db) => {
    const s = db.shares.find((x) => x.token === token);
    if (s) s.summaryCache = { hash, summary };
  });
}

// ---------- jornada da internação (apêndices A, C e H) ----------

export async function storeFile(file: File): Promise<string | undefined> {
  const id = crypto.randomUUID();
  try {
    await idbRun("readwrite", (s) => s.put(file, id));
    return id;
  } catch {
    return undefined;
  }
}

export type AdmissionInput = Omit<Admission, "id" | "createdAt" | "discharge" | "order"> & { orderFile?: File | null };

export async function saveAdmission(input: AdmissionInput, id?: string): Promise<{ error: string } | { id: string }> {
  const hospital = clean(input.hospital, 120);
  const procedure = clean(input.procedure, 160);
  if (!hospital) return { error: "Informe o hospital." };
  if (!procedure) return { error: "Informe o procedimento." };
  if (input.plannedDate && !isValidISODate(input.plannedDate)) return { error: "Data da internação inválida." };
  if (input.authValidUntil && !isValidISODate(input.authValidUntil)) return { error: "Validade da autorização inválida." };
  const order = input.orderFile
    ? { name: clean(input.orderFile.name, 160) || "pedido", mimeType: clean(input.orderFile.type, 60), storedAs: await storeFile(input.orderFile) }
    : undefined;
  const newId = id ?? crypto.randomUUID();
  update((db) => {
    db.admissions ??= [];
    const known = new Set(db.documents.map((d) => d.id));
    const fields = {
      hospital,
      procedure,
      plannedDate: input.plannedDate,
      requestingDoctor: clean(input.requestingDoctor, 100),
      plan: clean(input.plan, 80),
      cardNumber: clean(input.cardNumber, 40),
      authNumber: clean(input.authNumber, 40),
      authValidUntil: input.authValidUntil,
      supportDocIds: input.supportDocIds.filter((d) => known.has(d)).slice(0, 20),
    };
    const existing = db.admissions.find((a) => a.id === newId);
    if (existing) Object.assign(existing, fields, order ? { order } : {});
    else db.admissions.push({ id: newId, createdAt: new Date().toISOString(), ...fields, order });
  });
  return { id: newId };
}

/** Demonstração: o hospital manda o resumo da alta, e começa o acompanhamento. */
export function simulateDischargeFor(admissionId: string) {
  update((db) => {
    const ad = db.admissions?.find((a) => a.id === admissionId);
    if (!ad || ad.discharge) return;
    const d = simulatedDischarge(ad);
    ad.discharge = d;
    db.encounters.push({
      id: `enc-alta-${ad.id}`,
      date: d.date,
      specialty: "Internação",
      professional: ad.requestingDoctor || "Equipe do hospital",
      place: ad.hospital,
      reason: ad.procedure,
      notes: "Alta hospitalar. Resumo da alta e acompanhamento de 30 dias no Elo Saúde.",
    });
    for (const m of d.newMeds) {
      db.medications.push({
        id: `med-alta-${ad.id}-${m.name}`,
        name: m.name,
        dose: m.dose,
        frequency: m.frequency,
        startDate: d.date,
        endDate: addDays(d.date, m.days),
        reason: `Depois da alta: ${ad.procedure}`,
      });
    }
  });
}

export function addCheckIn(admissionId: string, symptoms: CheckInSymptom[], tookMeds: boolean) {
  update((db) => {
    db.checkins ??= [];
    db.checkins.push({ id: crypto.randomUUID(), admissionId, at: new Date().toISOString(), symptoms, tookMeds });
  });
}

// ---------- qualidade da leitura (apêndice F) ----------

const sameNum = (a: number | null, b: number | null) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 1e-9);

/**
 * Compara o que a leitura trouxe com o que a pessoa salvou. Cada exame conta
 * 4 campos (valor, unidade, referência mínima e máxima); remover a linha conta
 * os 4 como corrigidos.
 */
export function recordReadingReview(original: ExtractedResult[], saved: (ExtractedResult | null)[]) {
  update((db) => {
    db.readingStats ??= {};
    original.forEach((o, i) => {
      const key = o.analyteKey || "outro";
      const st = (db.readingStats![key] ??= { key, name: analyteInfo(key)?.name ?? o.name, reads: 0, fields: 0, corrected: 0 });
      const s = saved[i];
      st.reads += 1;
      st.fields += 4;
      if (!s) st.corrected += 4;
      else {
        if (!sameNum(o.value, s.value) || (o.value == null && (o.valueText ?? "") !== (s.valueText ?? ""))) st.corrected += 1;
        if ((o.unit ?? "").trim() !== (s.unit ?? "").trim()) st.corrected += 1;
        if (!sameNum(o.refLow, s.refLow)) st.corrected += 1;
        if (!sameNum(o.refHigh, s.refHigh)) st.corrected += 1;
      }
    });
  });
}

export function countFhirExport() {
  update((db) => {
    db.fhirExports = (db.fhirExports ?? 0) + 1;
  });
}

/** Importação de FHIR (apêndice D): junta sem duplicar. */
export function importRecords(rec: {
  vaccines: { name: string; date: string; dose?: string }[];
  labs: { date: string; lab?: string; results: { analyteKey: string; name: string; value: number | null; unit: string; refLow: number | null; refHigh: number | null }[] }[];
  sourceLabel: string;
}): { vaccines: number; results: number } {
  let nv = 0;
  let nr = 0;
  update((db) => {
    for (const v of rec.vaccines) {
      if (!isValidISODate(v.date) || db.vaccines.some((x) => x.name.toLowerCase() === v.name.toLowerCase() && x.date === v.date)) continue;
      db.vaccines.push({ id: crypto.randomUUID(), name: clean(v.name, 120), date: v.date, dose: clean(v.dose, 60) || undefined });
      nv++;
    }
    for (const group of rec.labs) {
      if (!isValidISODate(group.date)) continue;
      const fresh = group.results.filter((r) => !db.labResults.some((x) => x.analyteKey === r.analyteKey && x.date === group.date && sameNum(x.value, r.value)));
      if (!fresh.length) continue;
      const docId = crypto.randomUUID();
      db.documents.push({ id: docId, filename: `${rec.sourceLabel}.json`, mimeType: "application/fhir+json", uploadedAt: new Date().toISOString(), examDate: group.date, lab: clean(group.lab, 120) || rec.sourceLabel, extractedBy: "seed" });
      for (const r of fresh) {
        const key = resolveAnalyteKey(r.analyteKey, r.name);
        db.labResults.push({ id: crypto.randomUUID(), documentId: docId, analyteKey: key, name: clean(r.name, 120), value: finite(r.value), unit: clean(r.unit, 30), refLow: finite(r.refLow), refHigh: finite(r.refHigh), date: group.date, lab: clean(group.lab, 120) || rec.sourceLabel });
        nr++;
      }
    }
  });
  return { vaccines: nv, results: nr };
}
