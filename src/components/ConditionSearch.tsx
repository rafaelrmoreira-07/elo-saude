"use client";

import { useId, useState } from "react";
import { CONDITIONS, dataForCondition, freeTextSearch, matchConditions, type Condition } from "@/lib/conditions";
import { formatDate } from "@/lib/dates";
import { fmt } from "@/lib/health";
import type { ScopedData } from "@/lib/share";
import { SearchIcon } from "./icons";
import { StatusBadge } from "./ui";

const SUGGESTIONS = ["Diabetes", "Hipertensão", "Apneia do sono", "Anemia", "Tireoide", "Arritmia"];

/**
 * Busca por suspeita na tela do médico: ele digita uma doença e vê o que o
 * histórico compartilhado tem de ligado a ela, e o que ainda falta pedir.
 */
export function ConditionSearch({ data }: { data: ScopedData }) {
  const [q, setQ] = useState("");
  const id = useId();
  const matches = matchConditions(q);
  const free = q.trim().length >= 3 && !matches.length ? freeTextSearch(q, data) : null;

  return (
    <section className="tile" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">Buscar por suspeita</h2>
      <p className="mt-1 text-sm text-muted">Digite uma doença para ver os exames, sinais, alertas, remédios e consultas do paciente ligados a ela.</p>
      <label htmlFor={`${id}-q`} className="sr-only">Doença ou suspeita</label>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-control bg-white px-3 focus-within:border-ink">
        <SearchIcon width={18} className="shrink-0 text-muted" />
        <input
          id={`${id}-q`}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex.: diabetes, apneia, anemia"
          autoComplete="off"
          className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted focus-visible:outline-none"
        />
      </div>
      {!q && (
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setQ(s)} className="min-h-10 rounded-full border border-line-strong bg-white px-3.5 text-sm font-medium text-ink hover:border-ink">
              {s}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {matches.map((c) => <ConditionResult key={c.id} c={c} data={data} />)}
        {free && <FreeResult query={q} r={free} />}
        {q.trim().length >= 2 && !matches.length && !free && <p className="mt-4 text-sm text-muted">Continue digitando…</p>}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Junta os dados do paciente ligados à suspeita; não sugere nem confirma diagnóstico. Lista de doenças e exames relacionados definida pela equipe ({CONDITIONS.length} doenças).
      </p>
    </section>
  );
}

function ConditionResult({ c, data }: { c: Condition; data: ScopedData }) {
  const r = dataForCondition(c, data);
  const empty = !r.labs.length && !r.metrics.length && !r.alerts.length && !r.meds.length && !r.encounters.length;
  return (
    <div className="mt-4 border-t border-line pt-4">
      <h3 className="text-[17px] font-medium text-ink">{c.name}</h3>
      {empty && <p className="mt-1 text-sm text-muted">Nada no histórico compartilhado ligado a esta suspeita.</p>}

      {r.labs.length > 0 && (
        <Group title="Exames">
          {r.labs.map((s) => {
            const first = s.results.find((x) => x.value != null);
            const trend = first && s.latest.value != null && first !== s.latest ? ` · antes ${fmt(first.value!)} em ${formatDate(first.date)}` : "";
            return (
              <li key={s.key} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block text-[15px] text-ink">{s.name}</span>
                  <span className="num block text-xs text-muted">
                    {formatDate(s.latest.date)} · {s.results.length} {s.results.length === 1 ? "resultado" : "resultados"}
                    {trend}
                  </span>
                </span>
                <span className="num flex shrink-0 items-center gap-1.5 text-[15px]">
                  <strong>{s.latest.value != null ? fmt(s.latest.value) : s.latest.valueText}</strong> <span className="text-xs text-muted">{s.unit}</span>
                  <StatusBadge status={s.status} />
                </span>
              </li>
            );
          })}
        </Group>
      )}
      {r.missingLabs.length > 0 && <p className="mt-2 text-sm text-ink-soft"><span className="font-medium">Sem resultado no histórico compartilhado:</span> {r.missingLabs.join(", ")}.</p>}

      {r.metrics.length > 0 && (
        <Group title="Relógio, anel ou medidor (últimos 30 dias)">
          {r.metrics.map((m) => (
            <li key={m.key} className="flex items-center justify-between gap-3 py-2 text-[15px]">
              <span>{m.name}</span>
              <span className="num text-ink">{m.value} <span className="text-xs text-muted">{m.unit} · {m.days} dias</span></span>
            </li>
          ))}
        </Group>
      )}

      {r.alerts.length > 0 && (
        <Group title="Alertas automáticos">
          {r.alerts.map((a) => (
            <li key={a.id} className="py-2 text-[15px]">
              <span className={`font-medium ${a.severity === "procure_medico" ? "text-danger" : "text-warn"}`}>{a.title}</span>
              {a.clinical && <span className="block text-sm text-muted">{a.clinical}</span>}
            </li>
          ))}
        </Group>
      )}

      {r.meds.length > 0 && (
        <Group title="Remédios">
          {r.meds.map((m) => (
            <li key={m.id} className="py-2 text-[15px]">
              {m.name} {m.dose} <span className="text-sm text-muted">· {m.endDate ? `de ${formatDate(m.startDate)} a ${formatDate(m.endDate)}` : `desde ${formatDate(m.startDate)}`}{m.reason ? ` · ${m.reason}` : ""}</span>
            </li>
          ))}
        </Group>
      )}

      {r.encounters.length > 0 && (
        <Group title="Consultas">
          {r.encounters.map((e) => (
            <li key={e.id} className="py-2 text-[15px]">
              <span className="num">{formatDate(e.date)}</span> · {e.specialty}: {e.reason}
              {e.notes && <span className="block text-sm text-muted">{e.notes}</span>}
            </li>
          ))}
        </Group>
      )}
    </div>
  );
}

function FreeResult({ query, r }: { query: string; r: ReturnType<typeof freeTextSearch> }) {
  const total = r.labs.length + r.meds.length + r.encounters.length;
  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-sm text-muted">
        &quot;{query}&quot; não está na lista de doenças. {total ? "Itens do histórico com essa palavra:" : "Nenhum item do histórico tem essa palavra."}
      </p>
      {r.labs.length > 0 && (
        <Group title="Exames">
          {r.labs.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3 py-2 text-[15px]">
              <span>{s.name}</span>
              <span className="num flex items-center gap-1.5">
                <strong>{s.latest.value != null ? fmt(s.latest.value) : s.latest.valueText}</strong> <span className="text-xs text-muted">{s.unit}</span>
                <StatusBadge status={s.status} />
              </span>
            </li>
          ))}
        </Group>
      )}
      {r.meds.length > 0 && <Group title="Remédios">{r.meds.map((m) => <li key={m.id} className="py-2 text-[15px]">{m.name} {m.dose}</li>)}</Group>}
      {r.encounters.length > 0 && (
        <Group title="Consultas">
          {r.encounters.map((e) => <li key={e.id} className="py-2 text-[15px]"><span className="num">{formatDate(e.date)}</span> · {e.specialty}: {e.reason}</li>)}
        </Group>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{title}</p>
      <ul className="divide-y divide-line">{children}</ul>
    </div>
  );
}
