"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/dates";
import { fmt } from "@/lib/health";
import { appRef, catalogApp, classifySources } from "@/lib/healthApps";
import { getDbSnapshot, importWearables } from "@/lib/store";
import { ImportError, importWearableFile, METRIC_LABELS, sampleAndroidCsv, sampleAppleExport, summarize, type ImportResult } from "@/lib/wearableImport";
import { AlertIcon, CheckIcon, FileIcon, ShieldIcon, WatchIcon } from "./icons";
import { AppPicker, resolvePick, type AppPick } from "./Connections";
import { SlidingTabs } from "./SlidingTabs";
import { SectionTitle } from "./ui";

const ACCEPT = ".zip,.xml,.csv,.tsv,.txt,.json,.pdf,.png,.jpg,.jpeg,.webp,.heic,application/zip,text/csv,application/json,application/pdf,image/*";

type State =
  | { step: "idle"; error?: string; needsKey?: boolean }
  | { step: "reading"; filename: string; progress: number }
  | { step: "review"; result: ImportResult };

const SAMPLES = [
  { key: "apple", title: "Exportação do Apple Saúde", desc: "exportar.zip, 75 dias, com 3 dias de batimento irregular", make: () => sampleAppleExport() },
  { key: "android", title: "Planilha de app Android (CSV)", desc: "Exportação do Health Connect, 60 dias", make: () => sampleAndroidCsv() },
];

/** Importar os dados do relógio ou anel a partir do arquivo que o celular exporta. */
export function WearableImport({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ step: "idle" });
  const [os, setOs] = useState<"iphone" | "android" | "outros">("iphone");
  const fileRef = useRef<HTMLInputElement>(null);
  const run = useRef(0);

  async function read(file: File) {
    const id = ++run.current;
    setState({ step: "reading", filename: file.name, progress: 0 });
    try {
      const [result] = await Promise.all([
        importWearableFile(file, (p) => run.current === id && setState({ step: "reading", filename: file.name, progress: p })),
        new Promise((r) => setTimeout(r, 1200)), // deixa a etapa de leitura visível
      ]);
      if (run.current === id) setState({ step: "review", result });
    } catch (err) {
      if (run.current !== id) return;
      const e = err instanceof ImportError ? err : new ImportError("Não consegui ler este arquivo. Confira se é a exportação do Apple Saúde ou uma planilha com uma linha por dia.");
      setState({ step: "idle", error: e.message, needsKey: e.needsKey });
    }
  }

  function save(result: ImportResult, app: { id: string; name: string; kind: "central" | "fabricante" | "ia" | "outro" }) {
    importWearables(result, app, result.sources ? classifySources(result.sources, "ios") : undefined);
    toast.success(`${result.days.length} dias salvos`, { description: `Dados do ${app.name}` });
    router.push("/sinais");
  }

  if (state.step === "reading") return <Reading filename={state.filename} progress={state.progress} onCancel={() => { run.current++; setState({ step: "idle" }); }} />;
  if (state.step === "review") return <Review result={state.result} onCancel={() => setState({ step: "idle" })} onSave={(app) => save(state.result, app)} />;

  return (
    <div>
      <button type="button" onClick={onBack} className="btn-quiet -ml-1 mb-2 text-sm">Voltar para exames</button>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink"><WatchIcon width={26} /></span>
        <h2 className="title">Importar dados de outros apps</h2>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        Exporte o arquivo no app de origem (app Saúde, Health Connect, Samsung Health, Garmin, Oura, um app de saúde com IA e outros) e envie aqui.
        Na revisão você diz de qual app ele veio.
      </p>

      {state.step === "idle" && state.error && (
        <p className="mt-4 rounded-2xl bg-danger-soft p-4 text-[15px] text-danger" role="alert">
          {state.error}
          {state.needsKey && <> <Link href="/configuracoes" className="font-medium underline underline-offset-4">Abrir Configurações</Link></>}
        </p>
      )}

      <SectionTitle>Como exportar</SectionTitle>
      <SlidingTabs
        label="De onde vêm os dados"
        active={os}
        onChange={(k) => setOs(k as typeof os)}
        items={[{ key: "iphone", label: "iPhone" }, { key: "android", label: "Android" }, { key: "outros", label: "Outros apps" }]}
      />
      <div className="tile mt-3">
        {os === "outros" ? (
          <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink-soft">
            <li>
              No app do relógio, do anel ou no app de saúde com IA, procure <strong className="font-medium text-ink">Exportar</strong>,{" "}
              <strong className="font-medium text-ink">Baixar meus dados</strong> ou <strong className="font-medium text-ink">Compartilhar relatório</strong>.
            </li>
            <li>Serve planilha (CSV), arquivo JSON, relatório em PDF ou até um print da tela com os números.</li>
            <li>Envie aqui. A IA lê o arquivo e organiza um registro por dia; nada é inventado: o que não estiver no arquivo fica em branco.</li>
          </ol>
        ) : os === "iphone" ? (
          <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink-soft">
            <li>Abra o app <strong className="font-medium text-ink">Saúde</strong> e toque na sua foto, no canto de cima.</li>
            <li>Role até o fim e toque em <strong className="font-medium text-ink">Exportar Todos os Dados de Saúde</strong>.</li>
            <li>Salve o arquivo <strong className="font-medium text-ink">exportar.zip</strong> e envie aqui, do jeito que veio.</li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink-soft">
            <li>
              Pelo <strong className="font-medium text-ink">Google Takeout</strong>: marque só os dados do Fit ou Fitbit e baixe o .zip.
            </li>
            <li>
              Ou, com o <strong className="font-medium text-ink">Health Connect</strong>, use um app de exportação (como o Health Data Export) e gere uma planilha CSV dos
              últimos meses.
            </li>
            <li>Envie o .zip ou a planilha aqui.</li>
          </ol>
        )}
        <p className="mt-3 flex gap-2 border-t border-line pt-3 text-sm leading-relaxed text-muted">
          <ShieldIcon width={18} className="mt-0.5 shrink-0 text-ink" />
          A exportação do Apple Saúde e as planilhas são lidas aqui no seu aparelho: o arquivo não é enviado a lugar nenhum. Outros formatos
          (relatório em PDF, JSON ou print da tela) são organizados pela IA.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) read(f);
        }}
      />
      <button type="button" onClick={() => fileRef.current?.click()} className="lift mt-4 flex w-full items-center gap-4 rounded-3xl bg-ink p-5 text-left text-white">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink"><FileIcon width={28} /></span>
        <span>
          <span className="block text-xl font-normal tracking-[-0.02em]">Escolher o arquivo exportado</span>
          <span className="block text-[15px] text-navy-100">.zip do Apple Saúde ou do Google, planilha CSV, JSON, PDF ou print da tela</span>
        </span>
      </button>

      <SectionTitle>Exemplos</SectionTitle>
      <ul className="divide-y divide-line border-y border-line">
        {SAMPLES.map((s) => (
          <li key={s.key} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">{s.title}</p>
              <p className="text-sm text-muted">{s.desc}</p>
            </div>
            <DownloadLink make={s.make} />
            <button type="button" onClick={() => read(s.make())} className="btn-secondary min-h-11 px-4 text-sm">Usar</button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-muted">Os exemplos são gerados na hora, com datas até hoje, no formato real de cada exportação.</p>
    </div>
  );
}

function DownloadLink({ make }: { make: () => File }) {
  const [url, setUrl] = useState<{ href: string; name: string } | null>(null);
  useEffect(() => {
    const f = make();
    const href = URL.createObjectURL(f);
    queueMicrotask(() => setUrl({ href, name: f.name }));
    return () => URL.revokeObjectURL(href);
  }, [make]);
  if (!url) return null;
  return <a href={url.href} download={url.name} className="btn-quiet text-sm">Baixar</a>;
}

function Reading({ filename, progress, onCancel }: { filename: string; progress: number; onCancel: () => void }) {
  return (
    <div className="tile flex flex-col items-center py-10 text-center" aria-live="polite">
      <WatchIcon width={40} className="text-ink" />
      <p className="t-shimmer mt-4 text-lg">Organizando os dados do relógio…</p>
      <p className="mt-1 text-sm text-muted">{filename}</p>
      <div className="mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Progresso da leitura" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${Math.max(6, progress * 100)}%` }} />
      </div>
      <p className="num mt-2 text-sm text-muted">{progress > 0 ? `${Math.round(progress * 100)}%` : "Abrindo o arquivo"}</p>
      <button type="button" className="btn-secondary mt-6" onClick={onCancel}>Cancelar</button>
    </div>
  );
}

/** App sugerido para o arquivo: o do link (?app=), ou o que o próprio arquivo indica. */
function guessPick(result: ImportResult): AppPick {
  const q = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
  const fromUrl = q?.get("app");
  const k = q?.get("k");
  if (fromUrl) return k === "ia" || k === "outro" ? { choice: k, name: fromUrl } : { choice: fromUrl, name: "" };
  if (result.sources) return { choice: "apple-saude", name: "" };
  if (/takeout/i.test(result.source.label)) return { choice: "google-fit", name: "" };
  if (result.source.readBy === "ia" && result.source.label !== "Relatório organizado pela IA") {
    const known = appRef(result.source.label);
    return catalogApp(known.id) ? { choice: known.id, name: "" } : { choice: "ia", name: result.source.label };
  }
  return { choice: "", name: "" };
}

function Review({ result, onCancel, onSave }: { result: ImportResult; onCancel: () => void; onSave: (app: { id: string; name: string; kind: "central" | "fabricante" | "ia" | "outro" }) => void }) {
  const db = getDbSnapshot();
  const apps = db.apps ?? [];
  const [pick, setPick] = useState<AppPick>(() => guessPick(result));
  const app = resolvePick(pick, apps);
  const others = apps.some((a) => a.id !== app?.id) && db.wearableDays.length > 0;
  const missing = (Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[]).filter((k) => !result.metrics.includes(k));
  return (
    <div>
      <div className="rounded-2xl bg-navy-50 p-4 text-[15px] leading-relaxed text-ink">
        <p className="flex items-center gap-2 font-medium">
          <CheckIcon width={18} />
          {result.source.label}: {result.days.length} dias, de {formatDate(result.from)} a {formatDate(result.to)}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {result.source.readBy === "ia" ? "Organizado pela IA. Confira os números antes de salvar." : "Lido aqui no seu aparelho, direto do arquivo."} Arquivo: {result.source.filename}
        </p>
      </div>
      {result.notes.map((n) => <p key={n} className="mt-2 text-sm text-muted">{n}</p>)}

      <SectionTitle>O que foi encontrado</SectionTitle>
      <ul className="divide-y divide-line border-y border-line">
        {result.metrics.map((k) => {
          const s = summarize(result.days, k)!;
          const m = METRIC_LABELS[k];
          const label = m.agg === "total" ? "no período" : m.agg === "minimo" ? "menor valor" : "média";
          return (
            <li key={k} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium">{m.name}</p>
                <p className="num text-sm text-muted">{s.count} {s.count === 1 ? "dia" : "dias"} com medição</p>
              </div>
              <p className="num text-right text-[17px] font-medium">
                {k === "sleepHours" ? fmt(s.value) : s.value.toLocaleString("pt-BR")} <span className="text-sm font-normal text-muted">{m.unit}</span>
                <span className="block text-xs font-normal text-muted">{label}</span>
              </p>
            </li>
          );
        })}
      </ul>
      {missing.length > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Não estão no arquivo: {missing.map((k) => METRIC_LABELS[k].name.toLowerCase()).join(", ")}. Tudo bem: cada aparelho mede coisas diferentes, e o
          Elo mostra só o que foi medido.
        </p>
      )}
      <div className="tile mt-4">
        <AppPicker value={pick} onChange={setPick} apps={apps} />
        {result.sources && result.sources.length > 0 && (
          <p className="mt-2 text-sm text-muted">Gravaram estes dados: {result.sources.map((x) => x.name).join(", ")}. Eles entram em Apps e Aparelhos.</p>
        )}
      </div>
      {others && <p className="mt-3 text-sm text-muted">Se outro app já trouxe dados do mesmo dia, cada medida vem do app atualizado por último.</p>}
      {!app && (
        <p className="mt-3 flex gap-2 text-sm text-muted" aria-live="polite">
          <AlertIcon width={18} className="mt-0.5 shrink-0 text-warn" />
          Escolha o app para salvar: assim você sabe de onde veio cada dado e pode desconectar depois.
        </p>
      )}

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] mt-4 flex gap-2 bg-white/95 py-3 backdrop-blur">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn-primary flex-[2]" disabled={!app} onClick={() => app && onSave(app)}>Salvar {result.days.length} dias</button>
      </div>
    </div>
  );
}
