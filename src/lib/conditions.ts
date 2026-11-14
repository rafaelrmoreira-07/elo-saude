/**
 * Busca por suspeita clínica na tela do médico: o médico digita uma doença e a
 * plataforma mostra o que o histórico do paciente tem de ligado a ela (exames,
 * sinais do relógio, alertas, remédios e consultas). Não sugere diagnóstico:
 * só junta os dados que já existem e aponta o que falta.
 *
 * O vínculo doença → exames e sinais é uma lista curada e fixa, igual para
 * todos os pacientes. Revisar com um médico antes de ir para produção.
 */
import { analyteSeries, fmt, type AnalyteSeries } from "./health";
import type { Encounter, HealthAlert, LabResult, Medication, WearableDay } from "./types";

type Metric = keyof Omit<WearableDay, "date">;

export interface Condition {
  id: string;
  name: string;
  synonyms: string[];
  /** Exames que ajudam a avaliar a suspeita. */
  analytes: string[];
  /** Sinais de relógio, anel ou medidor ligados à suspeita. */
  metrics: Metric[];
  alertKinds: HealthAlert["kind"][];
  /** Palavras que ligam remédios e consultas à suspeita (sem acento, minúsculas). */
  words: string[];
}

export const CONDITIONS: Condition[] = [
  { id: "diabetes", name: "Diabetes e pré-diabetes", synonyms: ["diabetes", "pre-diabetes", "prediabetes", "glicemia alta", "hiperglicemia", "resistencia a insulina", "dm2"], analytes: ["glicose", "hba1c", "triglicerides", "creatinina", "tfg"], metrics: ["steps"], alertKinds: ["exames"], words: ["diabet", "glicem", "glicose", "insulin", "metformina", "glifage", "gliclazida", "dapagliflozina", "empagliflozina", "pre-diabetes"] },
  { id: "hipertensao", name: "Hipertensão arterial", synonyms: ["hipertensao", "pressao alta", "has", "hipertenso"], analytes: ["creatinina", "tfg", "potassio", "sodio", "glicose", "colesterol_total", "ldl"], metrics: ["systolic", "diastolic", "restingHr"], alertKinds: ["pressao", "cruzado"], words: ["pressao", "hipertens", "losartana", "enalapril", "captopril", "anlodipino", "hidroclorotiazida", "valsartana", "atenolol"] },
  { id: "dislipidemia", name: "Dislipidemia (colesterol e triglicerídeos)", synonyms: ["dislipidemia", "colesterol alto", "hipercolesterolemia", "triglicerides alto", "hipertrigliceridemia", "ldl alto"], analytes: ["colesterol_total", "ldl", "hdl", "triglicerides", "tgo", "tgp"], metrics: ["steps"], alertKinds: ["exames"], words: ["colesterol", "ldl", "triglicer", "estatina", "atorvastatina", "sinvastatina", "rosuvastatina", "dislipid"] },
  { id: "renal", name: "Doença renal crônica", synonyms: ["doenca renal", "insuficiencia renal", "drc", "rim", "nefropatia", "funcao renal"], analytes: ["creatinina", "tfg", "ureia", "potassio", "sodio", "acido_urico", "hemoglobina"], metrics: ["systolic", "diastolic"], alertKinds: ["exames", "pressao"], words: ["renal", "rim", "nefro", "creatinina", "dialise"] },
  { id: "anemia", name: "Anemia", synonyms: ["anemia", "anemico", "ferropriva", "hemoglobina baixa"], analytes: ["hemoglobina", "hematocrito", "vitamina_b12", "plaquetas", "leucocitos"], metrics: ["restingHr"], alertKinds: ["exames"], words: ["anemia", "ferro", "sulfato ferroso", "cansaco", "fadiga", "palidez", "b12"] },
  { id: "tireoide", name: "Doença da tireoide (hipo ou hiper)", synonyms: ["hipotireoidismo", "hipertireoidismo", "tireoide", "tiroide", "tireoidite", "hashimoto", "graves"], analytes: ["tsh", "t4_livre", "colesterol_total"], metrics: ["restingHr", "irregularRhythmEvents", "sleepHours"], alertKinds: ["exames", "fc_repouso"], words: ["tireo", "tiro", "levotiroxina", "puran", "euthyrox", "metimazol"] },
  { id: "apneia", name: "Apneia do sono", synonyms: ["apneia", "apneia do sono", "ronco", "saos", "disturbio do sono"], analytes: ["glicose", "hba1c", "hemoglobina"], metrics: ["spo2Min", "breathingDisturbances", "sleepHours", "systolic", "diastolic"], alertKinds: ["apneia", "cruzado", "pressao"], words: ["apneia", "ronco", "sono", "sonolencia", "polissonografia", "cpap"] },
  { id: "arritmia", name: "Fibrilação atrial e outras arritmias", synonyms: ["fibrilacao atrial", "fa", "arritmia", "palpitacao", "taquicardia", "ritmo irregular"], analytes: ["tsh", "t4_livre", "potassio", "sodio", "creatinina"], metrics: ["irregularRhythmEvents", "restingHr", "hrvMs", "systolic"], alertKinds: ["ritmo_irregular", "fc_repouso"], words: ["arritm", "palpita", "fibrilacao", "taquicard", "anticoagul", "varfarina", "rivaroxabana", "apixabana", "amiodarona", "ecg", "holter"] },
  { id: "figado", name: "Doença do fígado (esteatose, hepatite)", synonyms: ["esteatose", "gordura no figado", "hepatite", "figado", "doenca hepatica", "cirrose"], analytes: ["tgo", "tgp", "plaquetas", "triglicerides", "glicose"], metrics: [], alertKinds: ["exames"], words: ["figado", "hepat", "esteatose", "alcool"] },
  { id: "gota", name: "Gota e ácido úrico alto", synonyms: ["gota", "acido urico", "hiperuricemia"], analytes: ["acido_urico", "creatinina", "tfg"], metrics: [], alertKinds: ["exames"], words: ["gota", "urico", "alopurinol", "colchicina", "dor nas articula"] },
  { id: "vitamina_d", name: "Falta de vitamina D", synonyms: ["vitamina d", "deficiencia de vitamina d", "hipovitaminose d", "osteoporose"], analytes: ["vitamina_d"], metrics: ["steps"], alertKinds: ["exames"], words: ["vitamina d", "colecalciferol", "osteopor"] },
  { id: "b12", name: "Falta de vitamina B12", synonyms: ["vitamina b12", "b12", "deficiencia de b12"], analytes: ["vitamina_b12", "hemoglobina", "hematocrito"], metrics: [], alertKinds: ["exames"], words: ["b12", "cianocobalamina", "metformina", "formigamento"] },
  { id: "infeccao", name: "Infecção ou inflamação", synonyms: ["infeccao", "inflamacao", "febre", "sepse", "pneumonia", "infeccao urinaria"], analytes: ["leucocitos", "pcr", "plaquetas", "hemoglobina"], metrics: ["restingHr", "hrvMs", "spo2Min"], alertKinds: ["fc_repouso", "pos_alta"], words: ["infec", "febre", "inflama", "antibiot", "amoxicilina", "azitromicina", "tosse"] },
  { id: "prostata", name: "Doença da próstata", synonyms: ["prostata", "cancer de prostata", "hiperplasia prostatica", "hpb"], analytes: ["psa", "creatinina"], metrics: [], alertKinds: ["exames"], words: ["prostat", "psa", "urolog", "tansulosina", "finasterida"] },
  { id: "cardiovascular", name: "Risco cardiovascular e doença coronariana", synonyms: ["infarto", "doenca coronariana", "angina", "risco cardiovascular", "aterosclerose", "coracao"], analytes: ["ldl", "hdl", "colesterol_total", "triglicerides", "glicose", "hba1c", "creatinina", "pcr"], metrics: ["systolic", "diastolic", "restingHr", "steps"], alertKinds: ["pressao", "fc_repouso", "ritmo_irregular", "cruzado"], words: ["cardio", "coracao", "angina", "infarto", "dor no peito", "aas", "estatina", "clopidogrel"] },
  { id: "eletrolitos", name: "Alteração de sódio ou potássio", synonyms: ["hiponatremia", "hipercalemia", "hipocalemia", "sodio", "potassio", "eletrolitos"], analytes: ["sodio", "potassio", "creatinina", "ureia"], metrics: ["irregularRhythmEvents"], alertKinds: ["exames", "ritmo_irregular"], words: ["sodio", "potassio", "diuretico", "hidroclorotiazida", "furosemida", "espironolactona"] },
];

export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Doenças cujo nome ou sinônimo combina com o que o médico digitou. */
export function matchConditions(query: string): Condition[] {
  const q = norm(query);
  if (q.length < 2) return [];
  return CONDITIONS.filter((c) => [c.name, ...c.synonyms].some((s) => {
    const n = norm(s);
    return n.includes(q) || (q.length >= 4 && q.includes(n));
  }));
}

export interface ConditionData {
  labs: AnalyteSeries[];
  missingLabs: string[];
  metrics: { key: Metric; name: string; unit: string; value: string; days: number }[];
  alerts: HealthAlert[];
  meds: Medication[];
  encounters: Encounter[];
}

const METRIC_INFO: Record<Metric, { name: string; unit: string; agg: "media" | "minimo" | "total" }> = {
  restingHr: { name: "Batimentos em repouso", unit: "bpm", agg: "media" },
  hrvMs: { name: "Variabilidade cardíaca", unit: "ms", agg: "media" },
  sleepHours: { name: "Sono", unit: "h por noite", agg: "media" },
  spo2Min: { name: "Saturação mínima", unit: "%", agg: "minimo" },
  breathingDisturbances: { name: "Distúrbios respiratórios", unit: "por hora", agg: "media" },
  steps: { name: "Passos", unit: "por dia", agg: "media" },
  irregularRhythmEvents: { name: "Ritmo irregular", unit: "episódios", agg: "total" },
  systolic: { name: "Pressão sistólica", unit: "mmHg", agg: "media" },
  diastolic: { name: "Pressão diastólica", unit: "mmHg", agg: "media" },
};

const ANALYTE_NAMES: Record<string, string> = {
  acido_urico: "Ácido úrico", colesterol_total: "Colesterol total", creatinina: "Creatinina", glicose: "Glicose", hba1c: "Hemoglobina glicada (HbA1c)",
  hdl: "HDL", hematocrito: "Hematócrito", hemoglobina: "Hemoglobina", ldl: "LDL", leucocitos: "Leucócitos", pcr: "Proteína C reativa", plaquetas: "Plaquetas",
  potassio: "Potássio", psa: "PSA", sodio: "Sódio", t4_livre: "T4 livre", tfg: "Taxa de filtração glomerular", tgo: "TGO (AST)", tgp: "TGP (ALT)",
  triglicerides: "Triglicerídeos", tsh: "TSH", ureia: "Ureia", vitamina_b12: "Vitamina B12", vitamina_d: "Vitamina D (25-OH)",
};

const hasWord = (text: string | undefined | null, words: string[]) => {
  const t = norm(text ?? "");
  return t !== "" && words.some((w) => t.includes(w));
};

/** O que o histórico compartilhado tem ligado à suspeita (últimos 30 dias para os sinais). */
export function dataForCondition(
  c: Condition,
  d: { labResults: LabResult[]; wearableDays: WearableDay[]; alerts: HealthAlert[]; medications: Medication[]; encounters: Encounter[] },
): ConditionData {
  const series = analyteSeries(d.labResults);
  const labs = c.analytes.map((k) => series.find((s) => s.key === k)).filter((s): s is AnalyteSeries => Boolean(s));
  const missingLabs = c.analytes.filter((k) => !labs.some((s) => s.key === k)).map((k) => ANALYTE_NAMES[k] ?? k);

  const last30 = d.wearableDays.slice(-30);
  const metrics = c.metrics.flatMap((k) => {
    const vals = last30.map((day) => day[k]).filter((v): v is number => typeof v === "number");
    if (!vals.length) return [];
    const info = METRIC_INFO[k];
    const v = info.agg === "total" ? vals.reduce((a, b) => a + b, 0) : info.agg === "minimo" ? Math.min(...vals) : vals.reduce((a, b) => a + b, 0) / vals.length;
    const label = info.agg === "total" ? `${fmt(v)} em 30 dias` : info.agg === "minimo" ? `menor ${fmt(v)}` : `média ${fmt(Math.round(v * 10) / 10)}`;
    return [{ key: k, name: info.name, unit: info.unit, value: label, days: vals.length }];
  });

  return {
    labs,
    missingLabs,
    metrics,
    alerts: d.alerts.filter((a) => c.alertKinds.includes(a.kind) && (a.kind !== "exames" || labs.some((s) => s.status === "alto" || s.status === "baixo"))),
    meds: d.medications.filter((m) => hasWord(`${m.name} ${m.reason ?? ""}`, c.words)),
    encounters: d.encounters.filter((e) => hasWord(`${e.specialty} ${e.reason} ${e.notes ?? ""}`, c.words)),
  };
}

/** Busca livre quando a doença não está na lista: procura a palavra nos nomes dos exames, remédios e consultas. */
export function freeTextSearch(
  query: string,
  d: { labResults: LabResult[]; medications: Medication[]; encounters: Encounter[] },
): Pick<ConditionData, "labs" | "meds" | "encounters"> {
  const q = norm(query);
  const words = [q];
  return {
    labs: analyteSeries(d.labResults).filter((s) => norm(s.name).includes(q) || norm(s.key).includes(q)),
    meds: d.medications.filter((m) => hasWord(`${m.name} ${m.reason ?? ""}`, words)),
    encounters: d.encounters.filter((e) => hasWord(`${e.specialty} ${e.reason} ${e.notes ?? ""}`, words)),
  };
}
