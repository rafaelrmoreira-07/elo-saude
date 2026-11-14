"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/dates";
import { APP_CATALOG, APP_KIND_LABEL, appHow, appRef, catalogApp, DEVICE_KIND_LABEL } from "@/lib/healthApps";
import { addDevice, disconnectApp, removeDevice, updateDevice } from "@/lib/store";
import type { Db, DeviceKind, HealthApp, WearableDevice } from "@/lib/types";
import { AlertIcon, AppIcon, ChevronRight, DropIcon, GaugeIcon, HeartIcon, MobileIcon, PlusIcon, RingIcon, SparkleIcon, WatchIcon } from "./icons";
import { HealthConnectCard, usePlatform } from "./HealthConnect";
import { SectionTitle } from "./ui";

const DEVICE_ICON: Record<DeviceKind, typeof WatchIcon> = { relogio: WatchIcon, anel: RingIcon, medidor_pressao: GaugeIcon, oximetro: DropIcon, balanca: GaugeIcon, celular: MobileIcon, outro: WatchIcon, importado: WatchIcon };
const APP_ICON: Record<HealthApp["kind"], typeof WatchIcon> = { central: HeartIcon, fabricante: WatchIcon, ia: SparkleIcon, outro: AppIcon };

const DEVICE_KINDS: DeviceKind[] = ["relogio", "anel", "medidor_pressao", "oximetro", "balanca", "outro"];

function IconBox({ children }: { children: React.ReactNode }) {
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink">{children}</span>;
}

// ------------------------------------------------------------ escolha do app (importação)

export type AppPick = { choice: string; name: string };

/** App escolhido na importação. "ia" e "outro" pedem o nome (ex.: ChatHealth). */
export function resolvePick(p: AppPick, apps: HealthApp[]): Pick<HealthApp, "id" | "name" | "kind"> | null {
  if (!p.choice) return null;
  if (p.choice === "ia" || p.choice === "outro") return p.name.trim().length >= 2 ? appRef(p.name, p.choice) : null;
  const own = apps.find((a) => a.id === p.choice);
  if (own) return { id: own.id, name: own.name, kind: own.kind };
  return appRef(p.choice);
}

export function AppPicker({ value, onChange, apps }: { value: AppPick; onChange: (v: AppPick) => void; apps: HealthApp[] }) {
  const id = useId();
  const own = apps.filter((a) => !catalogApp(a.id));
  const centrals = APP_CATALOG.filter((a) => a.kind === "central");
  const makers = APP_CATALOG.filter((a) => a.kind === "fabricante");
  const needsName = value.choice === "ia" || value.choice === "outro";
  return (
    <div className="space-y-2">
      <label className="block" htmlFor={`${id}-app`}>
        <span className="label">De qual app vieram estes dados?</span>
      </label>
      <select id={`${id}-app`} className="input" value={value.choice} onChange={(e) => onChange({ choice: e.target.value, name: value.name })}>
        <option value="">Escolha o app</option>
        {own.length > 0 && (
          <optgroup label="Já conectados">
            {own.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </optgroup>
        )}
        <optgroup label="Central do celular">{centrals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>
        <optgroup label="Relógio, anel ou medidor">{makers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>
        <optgroup label="Outros">
          <option value="ia">App de saúde com IA</option>
          <option value="outro">Outro app</option>
        </optgroup>
      </select>
      {needsName && (
        <label className="block">
          <span className="label">Nome do app</span>
          <input className="input" value={value.name} maxLength={40} placeholder={value.choice === "ia" ? "Ex.: ChatHealth" : "Ex.: app do medidor"} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        </label>
      )}
    </div>
  );
}

// ------------------------------------------------------------ resumo na tela Sinais

/** Resumo curto na tela Sinais: apps de um lado, aparelhos do outro. */
export function ConnectionsSummary({ db }: { db: Db }) {
  const apps = db.apps ?? [];
  const last = db.wearableDays.at(-1)?.date;
  return (
    <div className="tile">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[15px]">
        <dt className="font-medium text-muted">Apps</dt>
        <dd className="min-w-0 text-ink">{apps.length ? apps.map((a) => a.name).join(", ") : "Nenhum conectado"}</dd>
        <dt className="font-medium text-muted">Aparelhos</dt>
        <dd className="min-w-0 text-ink">{db.devices.length ? db.devices.map((d) => d.name).join(", ") : "Nenhum cadastrado"}</dd>
      </dl>
      {last && <p className="num mt-1.5 text-sm text-muted">Dados até {formatDate(last)}</p>}
      <div className="mt-1 flex flex-wrap gap-x-4">
        <Link href="/configuracoes/#conexoes" className="btn-quiet -ml-1 text-sm">Gerenciar</Link>
        <Link href="/conexoes" className="btn-quiet text-sm">Conectar ou importar</Link>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Configurações › Apps conectados

export function AppsSection({ db }: { db: Db }) {
  const apps = db.apps ?? [];
  const tops = apps.filter((a) => !a.through);
  return (
    <>
      <SectionTitle id="conexoes">Apps conectados</SectionTitle>
      <div className="mb-2 empty:hidden">
        <HealthConnectCard />
      </div>
      {apps.length === 0 ? (
        <p className="tile text-[15px] text-muted">Nenhum app conectado. Os dados de relógio, anel e medidor chegam por um app.</p>
      ) : (
        <ul className="space-y-2">
          {tops.map((a) => (
            <li key={a.id}>
              <AppRow app={a} apps={apps} devices={db.devices} />
              {apps
                .filter((x) => x.through === a.id)
                .map((x) => (
                  <div key={x.id} className="mt-1 ml-6 border-l-2 border-line pl-3">
                    <AppRow app={x} apps={apps} devices={db.devices} />
                  </div>
                ))}
            </li>
          ))}
        </ul>
      )}
      <Link href="/conexoes" className="tile lift mt-2 flex min-h-14 items-center gap-3">
        <IconBox><PlusIcon width={18} /></IconBox>
        <span className="min-w-0 flex-1 text-[15px] font-medium text-ink">Conectar outro app</span>
        <ChevronRight width={18} className="shrink-0 text-faint" />
      </Link>
    </>
  );
}

function AppRow({ app, apps, devices }: { app: HealthApp; apps: HealthApp[]; devices: WearableDevice[] }) {
  const platform = usePlatform();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const Icon = APP_ICON[app.kind];
  const central = app.through ? apps.find((x) => x.id === app.through) : undefined;
  const mine = devices.filter((d) => d.appId === app.id);
  const panel = useId();

  function disconnect(deleteData: boolean) {
    disconnectApp(app.id, deleteData);
    toast.success(`${app.name} desconectado`, { description: deleteData ? "Os dados que vieram dele foram apagados." : "Os dados que já vieram continuam no seu histórico." });
  }

  return (
    <div className="tile">
      <div className="flex items-start gap-3">
        <IconBox><Icon width={20} /></IconBox>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-ink">{app.name}</p>
          <p className="text-sm text-muted">{appHow(app, apps)}</p>
          {mine.length > 0 && <p className="text-sm text-muted">Aparelhos: {mine.map((d) => d.name).join(", ")}</p>}
        </div>
        <button type="button" className="btn-quiet shrink-0 text-sm" aria-expanded={open} aria-controls={panel} onClick={() => { setOpen(!open); setConfirm(false); }}>
          {open ? "Fechar" : "Gerenciar"}
        </button>
      </div>
      {open && (
        <div id={panel} className="mt-3 space-y-2 border-t border-line pt-3">
          {app.metrics.length > 0 && <p className="text-sm text-muted">Lê: {app.metrics.join(", ").toLowerCase()}.</p>}
          <p className="text-xs text-muted">
            {APP_KIND_LABEL[app.kind]}{app.filename ? ` · arquivo ${app.filename}` : ""}. Conectado em {formatDateTime(app.connectedAt)}
            {app.lastSyncAt && app.lastSyncAt !== app.connectedAt ? `, atualizado em ${formatDateTime(app.lastSyncAt)}` : ""}.
          </p>
          {central && <p className="text-sm text-muted">Para o {app.name} parar de mandar dados, desligue o acesso dele dentro do {central.name}.</p>}
          {app.via === "conexao" && !app.through && (
            <p className="text-sm text-muted">
              {app.platform === "android" ? "Para tirar a permissão do Elo: Health Connect › Permissões do app › Elo Saúde." : "Para tirar a permissão do Elo: Ajustes do iPhone › Saúde › Acesso a Dados e Dispositivos › Elo Saúde."}
              {platform === "web" ? " A leitura direta funciona no app de iPhone e Android." : ""}
            </p>
          )}
          {app.via === "arquivo" && !app.through && (
            <Link href={`/enviar/?tipo=relogio&app=${encodeURIComponent(app.id)}`} className="btn-secondary w-full">Atualizar com um arquivo novo</Link>
          )}
          {!confirm ? (
            <button type="button" className="btn-secondary w-full" onClick={() => setConfirm(true)}>Desconectar</button>
          ) : (
            <div className="rounded-xl bg-warn-soft p-3" role="group" aria-label={`Desconectar ${app.name}`}>
              <p className="flex gap-2 text-sm text-ink">
                <AlertIcon width={18} className="mt-0.5 shrink-0 text-warn" />
                O que fazer com os dados que já vieram {central ? `do ${app.name} (eles estão junto com os do ${central.name})` : `do ${app.name}`}?
              </p>
              <div className="mt-2 grid gap-2">
                <button type="button" className="btn-secondary" onClick={() => disconnect(false)}>Desconectar e manter os dados</button>
                {!central && <button type="button" className="btn-danger" onClick={() => disconnect(true)}>Desconectar e apagar os dados</button>}
                <button type="button" className="btn-quiet justify-center text-sm" onClick={() => setConfirm(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ Configurações › Aparelhos

export function DevicesSection({ db }: { db: Db }) {
  const apps = db.apps ?? [];
  const [adding, setAdding] = useState(false);
  return (
    <>
      <SectionTitle>Aparelhos</SectionTitle>
      {db.devices.length === 0 && !adding && <p className="tile text-[15px] text-muted">Nenhum aparelho cadastrado. Eles aparecem sozinhos quando um app traz dados deles, ou você cadastra aqui.</p>}
      {db.devices.length > 0 && (
        <ul className="space-y-2">
          {db.devices.map((d) => <DeviceRow key={d.id} device={d} apps={apps} />)}
        </ul>
      )}
      {adding ? (
        <DeviceForm apps={apps} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" className="tile lift mt-2 flex min-h-14 w-full items-center gap-3 text-left" onClick={() => setAdding(true)}>
          <IconBox><PlusIcon width={18} /></IconBox>
          <span className="min-w-0 flex-1 text-[15px] font-medium text-ink">Adicionar aparelho</span>
        </button>
      )}
    </>
  );
}

function DeviceRow({ device: d, apps }: { device: WearableDevice; apps: HealthApp[] }) {
  const [open, setOpen] = useState(false);
  const Icon = DEVICE_ICON[d.kind];
  const app = apps.find((a) => a.id === d.appId);
  const panel = useId();
  return (
    <li className="tile">
      <div className="flex items-start gap-3">
        <IconBox><Icon width={20} /></IconBox>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-ink">{d.name}</p>
          <p className="text-sm text-muted">{DEVICE_KIND_LABEL[d.kind]} · {app ? `dados pelo ${app.name}` : "sem app"}</p>
          {!app && <p className="text-sm text-warn">Sem app ligado, os dados deste aparelho não chegam ao Elo.</p>}
          {d.detected && <p className="text-xs text-muted">Encontrado nos dados do app</p>}
        </div>
        <button type="button" className="btn-quiet shrink-0 text-sm" aria-expanded={open} aria-controls={panel} onClick={() => setOpen(!open)}>
          {open ? "Fechar" : "Gerenciar"}
        </button>
      </div>
      {open && (
        <div id={panel} className="mt-3 space-y-2 border-t border-line pt-3">
          <label className="block">
            <span className="label">Os dados chegam pelo app</span>
            <select className="input" value={d.appId ?? ""} onChange={(e) => updateDevice(d.id, { appId: e.target.value || undefined })}>
              <option value="">Nenhum</option>
              {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="btn-danger w-full"
            onClick={() => {
              removeDevice(d.id);
              toast.success(`${d.name} removido`, { description: "Os dados que já vieram dele continuam no histórico." });
            }}
          >
            Remover aparelho
          </button>
        </div>
      )}
    </li>
  );
}

function DeviceForm({ apps, onDone }: { apps: HealthApp[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<DeviceKind>("relogio");
  const [appId, setAppId] = useState(apps.find((a) => !a.through)?.id ?? "");
  const valid = name.trim().length >= 2;
  return (
    <form
      className="tile mt-2 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        addDevice({ name, kind, appId });
        toast.success(`${name.trim()} adicionado`);
        onDone();
      }}
    >
      <label className="block">
        <span className="label">Nome do aparelho</span>
        <input className="input" value={name} maxLength={40} placeholder="Ex.: Galaxy Watch, medidor Omron" onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label className="block">
        <span className="label">Tipo</span>
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as DeviceKind)}>
          {DEVICE_KINDS.map((k) => <option key={k} value={k}>{DEVICE_KIND_LABEL[k]}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="label">Os dados chegam pelo app</span>
        <select className="input" value={appId} onChange={(e) => setAppId(e.target.value)}>
          <option value="">Nenhum por enquanto</option>
          {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={onDone}>Cancelar</button>
        <button type="submit" className="btn-primary flex-[2]" disabled={!valid}>Adicionar</button>
      </div>
    </form>
  );
}
