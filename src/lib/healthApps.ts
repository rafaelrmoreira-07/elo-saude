/**
 * Apps e aparelhos conectados, separados para governança:
 * - App: por onde os dados chegam. É o que a pessoa autoriza, atualiza ou desconecta.
 * - Aparelho: o que mede (relógio, anel, medidor). Sempre ligado a um app.
 *
 * Como cada app chega ao Elo:
 * - Centrais do celular (Apple Saúde, Health Connect): conexão direta, só no app de iPhone e Android.
 * - Apps de relógio, anel e medidor: gravam na central do celular, e o Elo lê de lá.
 *   Sem o app do Elo, a pessoa importa o arquivo que o app exporta.
 * - Apps de saúde com IA e outros: importação do relatório ou do arquivo exportado.
 */
import type { DeviceKind, HealthApp, PersonaId, WearableDay, WearableDevice } from "./types";

export interface AppInfo {
  id: string;
  name: string;
  kind: HealthApp["kind"];
  /** O que costuma trazer, em poucas palavras. */
  brings: string;
  /** Centrais em que o app grava os dados (o Elo lê de lá). */
  syncs: ("ios" | "android")[];
  /** Pacote Android ou bundle iOS, para reconhecer o app nos dados da central. */
  ids?: string[];
  /** Nome como aparece na exportação do Apple Saúde. */
  match?: RegExp;
  /** Como exportar o arquivo no próprio app. */
  export: string;
}

export const CENTRAL_ID = { ios: "apple-saude", android: "health-connect" } as const;

export const APP_CATALOG: AppInfo[] = [
  {
    id: "apple-saude",
    name: "Apple Saúde",
    kind: "central",
    brings: "Apple Watch, iPhone e apps que gravam no Saúde",
    syncs: ["ios"],
    ids: ["com.apple.Health"],
    match: /^(sa[uú]de|health)$/i,
    export: "No app Saúde, toque na sua foto e em Exportar Todos os Dados de Saúde.",
  },
  {
    id: "health-connect",
    name: "Health Connect",
    kind: "central",
    brings: "Samsung Health, Google Fit, Fitbit e outros apps do Android",
    syncs: ["android"],
    ids: ["com.google.android.apps.healthdata"],
    export: "Use um app de exportação do Health Connect e gere uma planilha CSV.",
  },
  { id: "samsung-health", name: "Samsung Health", kind: "fabricante", brings: "Galaxy Watch e Galaxy Ring", syncs: ["android"], ids: ["com.sec.android.app.shealth"], match: /samsung|galaxy/i, export: "No Samsung Health, abra Ajustes e Baixar dados pessoais." },
  { id: "google-fit", name: "Google Fit", kind: "fabricante", brings: "Pixel Watch e o celular", syncs: ["android"], ids: ["com.google.android.apps.fitness"], match: /google fit/i, export: "Pelo Google Takeout, marque só os dados do Fit." },
  { id: "fitbit", name: "Fitbit", kind: "fabricante", brings: "pulseiras e relógios Fitbit", syncs: ["android"], ids: ["com.fitbit.FitbitMobile"], match: /fitbit/i, export: "Pelo Google Takeout, marque só os dados do Fitbit." },
  { id: "garmin-connect", name: "Garmin Connect", kind: "fabricante", brings: "relógios Garmin", syncs: ["ios", "android"], ids: ["com.garmin.android.apps.connectmobile", "com.garmin.connect.mobile"], match: /garmin/i, export: "No Garmin Connect pela web, peça a exportação dos seus dados." },
  { id: "oura", name: "Oura", kind: "fabricante", brings: "anel Oura", syncs: ["ios", "android"], ids: ["com.ouraring.oura"], match: /oura/i, export: "No site da Oura, em Minha conta, exporte os dados em CSV." },
  { id: "withings", name: "Withings", kind: "fabricante", brings: "medidor de pressão, balança e relógio", syncs: ["ios", "android"], ids: ["com.withings.wiscale2", "com.withings.healthmate"], match: /withings|health mate/i, export: "No app Withings, em Perfil, baixe os dados." },
  { id: "omron-connect", name: "Omron Connect", kind: "fabricante", brings: "medidor de pressão Omron", syncs: ["ios", "android"], ids: ["jp.co.omron.healthcare.omron_connect", "com.omronhealthcare.omronconnect"], match: /omron/i, export: "No Omron Connect, exporte o histórico de medições." },
  { id: "zepp", name: "Zepp (Amazfit)", kind: "fabricante", brings: "relógios Amazfit", syncs: ["ios", "android"], ids: ["com.huami.watch.hmwatchmanager", "com.huami.midong"], match: /zepp|amazfit/i, export: "No Zepp, em Perfil e Ajustes, exporte os dados." },
  { id: "mi-fitness", name: "Mi Fitness (Xiaomi)", kind: "fabricante", brings: "Mi Band e relógios Xiaomi", syncs: ["ios", "android"], ids: ["com.xiaomi.wearable", "com.mi.health"], match: /xiaomi|mi fitness|mi band/i, export: "No Mi Fitness, peça a exportação dos dados." },
  { id: "polar-flow", name: "Polar Flow", kind: "fabricante", brings: "relógios e cintas Polar", syncs: ["ios", "android"], ids: ["fi.polar.polarflow"], match: /polar/i, export: "No Polar Flow pela web, exporte os dados." },
  { id: "whoop", name: "WHOOP", kind: "fabricante", brings: "pulseira WHOOP", syncs: ["ios", "android"], ids: ["com.whoop.android", "com.whoop.iphone"], match: /whoop/i, export: "No app WHOOP, exporte os dados em Ajustes." },
];

export const APP_KIND_LABEL: Record<HealthApp["kind"], string> = {
  central: "Central de saúde do celular",
  fabricante: "App de relógio, anel ou medidor",
  ia: "App de saúde com IA",
  outro: "Outro app",
};

export const DEVICE_KIND_LABEL: Record<DeviceKind, string> = {
  relogio: "Relógio ou pulseira",
  anel: "Anel",
  medidor_pressao: "Medidor de pressão",
  oximetro: "Oxímetro",
  balanca: "Balança",
  celular: "Celular",
  outro: "Outro aparelho",
  importado: "Aparelho",
};

export function catalogApp(id: string): AppInfo | undefined {
  return APP_CATALOG.find((a) => a.id === id);
}

export const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "app";

/** App a partir do catálogo ou de um nome digitado ("ChatHealth", por exemplo). */
export function appRef(idOrName: string, kind: HealthApp["kind"] = "outro"): Pick<HealthApp, "id" | "name" | "kind"> {
  const known = catalogApp(idOrName) ?? APP_CATALOG.find((a) => a.match?.test(idOrName) || a.name.toLowerCase() === idOrName.toLowerCase());
  if (known) return { id: known.id, name: known.name, kind: known.kind };
  const name = idOrName.trim();
  return { id: `app-${slug(name)}`, name, kind };
}

/** Frase curta de como o app entrega os dados. */
export function appHow(app: HealthApp, apps: HealthApp[] = []): string {
  if (app.through) return `Chega pelo ${apps.find((a) => a.id === app.through)?.name ?? catalogApp(app.through)?.name ?? "app do celular"}`;
  if (app.via === "conexao") return app.platform === "android" ? "Conectado no Android" : app.platform === "ios" ? "Conectado no iPhone" : "Conectado no celular";
  return app.readBy === "ia" ? "Arquivo importado, organizado pela IA" : "Arquivo importado";
}

// ------------------------------------------------------------ detecção

/** Uma origem como a central do celular informa (nome do app ou aparelho, pacote, tipo). */
export interface SourceSeen {
  name: string;
  id?: string;
  deviceType?: string;
  metrics: Set<string>;
}

export interface Detected {
  apps: Pick<HealthApp, "id" | "name" | "kind" | "metrics">[];
  devices: Pick<WearableDevice, "id" | "name" | "kind" | "metrics" | "appId">[];
}

const looksLikePackage = (s: string) => /^[a-z0-9_]+(\.[a-z0-9_]+){1,}$/i.test(s);

const ANDROID_TYPE: Record<string, DeviceKind> = { watch: "relogio", fitnessBand: "relogio", ring: "anel", phone: "celular", scale: "balanca", chestStrap: "outro", headMounted: "outro", smartDisplay: "outro" };

function kindByName(name: string): DeviceKind | null {
  if (/watch|rel[oó]gio/i.test(name)) return "relogio";
  if (/iphone|phone|celular/i.test(name)) return "celular";
  if (/ring|anel/i.test(name)) return "anel";
  return null;
}

function prettyPackage(pkg: string): string {
  const last = pkg.split(".").filter((p) => !/^(com|br|android|app|apps|mobile|org|net|io)$/i.test(p)).at(-1) ?? pkg;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

/**
 * Classifica as origens lidas da central (ou da exportação do Apple Saúde)
 * em apps e aparelhos. Aparelho só entra quando a origem diz qual é (Apple
 * Watch, ou o tipo informado pelo Health Connect): nada é inventado.
 */
export function classifySources(sources: SourceSeen[], hub: "ios" | "android"): Detected {
  const central = CENTRAL_ID[hub];
  const apps = new Map<string, Detected["apps"][number]>();
  const devices = new Map<string, Detected["devices"][number]>();
  const addApp = (ref: Pick<HealthApp, "id" | "name" | "kind">, metrics: Set<string>) => {
    const a = apps.get(ref.id) ?? { ...ref, metrics: [] };
    a.metrics = [...new Set([...a.metrics, ...metrics])];
    apps.set(ref.id, a);
    return a.id;
  };
  const addDevice = (name: string, kind: DeviceKind, appId: string, metrics: Set<string>) => {
    const id = `dev-${slug(name)}`;
    const d = devices.get(id) ?? { id, name, kind, appId, metrics: [] };
    d.metrics = [...new Set([...d.metrics, ...metrics])];
    devices.set(id, d);
  };

  for (const s of sources) {
    const id = s.id ?? "";
    const known = APP_CATALOG.find((a) => (id && a.ids?.includes(id)) || (!id && a.match?.test(s.name)));

    // iPhone: aparelhos da Apple chegam como origem própria (com.apple.health.<id>)
    if (hub === "ios" && (/^com\.apple\.health\./i.test(id) || (!id && /apple watch|iphone/i.test(s.name)))) {
      addApp({ id: central, name: "Apple Saúde", kind: "central" }, s.metrics);
      addDevice(s.name, kindByName(s.name) ?? "outro", central, s.metrics);
      continue;
    }
    if (known) {
      const appId = addApp({ id: known.id, name: known.name, kind: known.kind }, s.metrics);
      if (hub === "android" && s.deviceType && ANDROID_TYPE[s.deviceType]) {
        const kind = ANDROID_TYPE[s.deviceType];
        addDevice(looksLikePackage(s.name) ? `${DEVICE_KIND_LABEL[kind]} (${known.name})` : s.name, kind, appId, s.metrics);
      }
      continue;
    }
    // App fora do catálogo: entra com o nome que a central informa
    const name = hub === "android" && looksLikePackage(id || s.name) ? prettyPackage(id || s.name) : s.name;
    const appId = addApp({ id: `app-${slug(id || name)}`, name, kind: "outro" }, s.metrics);
    if (hub === "android" && s.deviceType && ANDROID_TYPE[s.deviceType]) {
      const kind = ANDROID_TYPE[s.deviceType];
      addDevice(looksLikePackage(s.name) ? `${DEVICE_KIND_LABEL[kind]} (${name})` : s.name, kind, appId, s.metrics);
    }
  }
  return { apps: [...apps.values()], devices: [...devices.values()] };
}

// ------------------------------------------------------------ dias por app

const FIELDS = ["restingHr", "hrvMs", "sleepHours", "spo2Min", "breathingDisturbances", "steps", "irregularRhythmEvents", "systolic", "diastolic"] as const;

/**
 * Junta os dias de cada app num registro por dia. Em cada medida vale o app
 * atualizado mais recentemente que tem aquele dado (sem somar em dobro).
 */
export function mergeAppDays(apps: HealthApp[], appDays: Record<string, WearableDay[]>): WearableDay[] {
  const order = [...apps].sort((a, b) => (b.lastSyncAt ?? b.connectedAt).localeCompare(a.lastSyncAt ?? a.connectedAt)).map((a) => a.id);
  for (const k of Object.keys(appDays)) if (!order.includes(k)) order.push(k);
  const byDate = new Map<string, WearableDay>();
  for (const id of order) {
    for (const d of appDays[id] ?? []) {
      const cur = byDate.get(d.date);
      if (!cur) {
        byDate.set(d.date, { ...d });
        continue;
      }
      for (const f of FIELDS) if (cur[f] == null && d[f] != null) cur[f] = d[f];
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// ------------------------------------------------------------ demonstração

/** Apps e aparelhos das personas de demonstração (ligados aos aparelhos que já existem nelas). */
export function personaConnections(personaId: PersonaId | undefined, connectedAt: string): { apps: HealthApp[]; devices: Record<string, Partial<WearableDevice>> } {
  const base = { connectedAt, lastSyncAt: connectedAt };
  switch (personaId ?? "carlos") {
    case "carlos":
      return {
        apps: [
          { id: "apple-saude", name: "Apple Saúde", kind: "central", via: "conexao", platform: "ios", metrics: ["Batimentos", "Variabilidade", "Ritmo irregular", "Sono", "Saturação", "Passos"], ...base },
          { id: "omron-connect", name: "Omron Connect", kind: "fabricante", via: "conexao", through: "apple-saude", metrics: ["Pressão arterial"], ...base },
        ],
        devices: { "dev-relogio": { name: "Apple Watch", appId: "apple-saude" }, "dev-pressao": { name: "Medidor de pressão Omron", appId: "omron-connect" } },
      };
    case "juliana":
      return {
        apps: [
          { id: "apple-saude", name: "Apple Saúde", kind: "central", via: "conexao", platform: "ios", metrics: ["Batimentos", "Variabilidade", "Sono", "Saturação", "Passos"], ...base },
          { id: "oura", name: "Oura", kind: "fabricante", via: "conexao", through: "apple-saude", metrics: ["Batimentos", "Variabilidade", "Sono", "Saturação"], ...base },
        ],
        devices: { "dev-anel": { name: "Anel Oura", appId: "oura" } },
      };
    case "pedro":
      return {
        apps: [
          { id: "health-connect", name: "Health Connect", kind: "central", via: "conexao", platform: "android", metrics: ["Batimentos", "Variabilidade", "Ritmo irregular", "Sono", "Saturação", "Passos"], ...base },
          { id: "samsung-health", name: "Samsung Health", kind: "fabricante", via: "conexao", through: "health-connect", metrics: ["Batimentos", "Variabilidade", "Ritmo irregular", "Sono", "Saturação", "Passos"], ...base },
        ],
        devices: { "dev-galaxy": { name: "Galaxy Watch", appId: "samsung-health" } },
      };
    default:
      return { apps: [], devices: {} };
  }
}
