"use client";

import NumberFlow from "@number-flow/react";
import Link from "next/link";
import { CHART, WearableChart } from "@/components/charts";
import { ConnectionsSummary } from "@/components/Connections";
import { WatchIcon } from "@/components/icons";
import { AlertCard, Disclaimer, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { formatDate, todayISO } from "@/lib/dates";
import { computeAlerts, fmt, hasBloodPressure, hasMetric, wearableSnapshot } from "@/lib/health";
import type { WearableMetric } from "@/lib/types";
import { useDb } from "@/lib/store";
import { HealthConnectCard, usePlatform } from "@/components/HealthConnect";

export default function WearablesPage() {
  const db = useDb();
  return (
    <div>
      <PageHeader title="Sinais">Batimentos, sono, saturação, passos e pressão, vindos dos seus apps e aparelhos.</PageHeader>
      {db ? <Wearables db={db} /> : <Skeleton lines={5} />}
    </div>
  );
}

function Wearables({ db }: { db: NonNullable<ReturnType<typeof useDb>> }) {
  const platform = usePlatform();
  const alerts = computeAlerts(db).filter((a) => a.kind !== "exames" && a.kind !== "cruzado" && a.kind !== "pos_alta" && a.kind !== "nao_lido");
  const days = db.wearableDays;
  if (!days.length)
    return (
      <>
      {platform !== "web" && (
        <div className="mb-3">
          <HealthConnectCard />
        </div>
      )}
      <div className="tile mt-2 flex flex-col items-center px-6 py-10 text-center">
        <WatchIcon width={40} className="text-faint" />
        <p className="mt-3 text-lg font-medium text-ink">Nenhum dado de app ou aparelho</p>
        <p className="mt-1 max-w-sm text-[15px] text-muted">Conecte um app de saúde ou importe o arquivo que ele exporta.</p>
        <Link href="/conexoes" className="btn-primary mt-6">Conectar app</Link>
      </div>
      </>
    );
  const src = db.wearableSource;
  const imported = src?.kind === "importado";
  const has = (k: WearableMetric) => hasMetric(days, k);
  const bp = hasBloodPressure(days);
  const w = wearableSnapshot(days);
  const irregular = days.filter((d) => (d.irregularRhythmEvents ?? 0) > 0).reverse();
  const until = w.until < todayISO() ? `, até ${formatDate(w.until, { day: "2-digit", month: "2-digit" })}` : "";

  return (
    <div>
      {platform !== "web" && (
        <div className="mb-3">
          <HealthConnectCard />
        </div>
      )}
      <ConnectionsSummary db={db} />

      {alerts.length > 0 && (
        <>
          <SectionTitle>Alertas</SectionTitle>
          <div className="space-y-2">
            {alerts.map((a) => <AlertCard key={a.id} alert={a} cta={false} />)}
          </div>
        </>
      )}

      {has("restingHr") && (
        <Chart title="Batimentos em repouso" value={w.restingHr} unit={`bpm, média de 7 dias${until}`}>
          <WearableChart days={days} unit="bpm" series={[{ key: "restingHr", name: "Repouso", color: CHART.ink }]} />
        </Chart>
      )}

      {bp && (
        <Chart title="Pressão arterial" value={w.systolic} second={w.diastolic} unit={`mmHg, média de 7 dias${until}`} warn={(w.systolic ?? 0) >= 130 || (w.diastolic ?? 0) >= 80}>
          <WearableChart
            days={days}
            unit="mmHg"
            domain={[60, 160]}
            refs={[{ y: 130, label: "130", color: CHART.warn }, { y: 80, label: "80", color: CHART.warn }]}
            series={[{ key: "systolic", name: "Sistólica", color: CHART.plum }, { key: "diastolic", name: "Diastólica", color: CHART.plum, dashed: true }]}
          />
        </Chart>
      )}

      {has("spo2Min") && (
        <Chart title="Saturação mínima à noite" value={w.spo2Min} unit={`%, menor valor em 7 dias${until}`} warn={(w.spo2Min ?? 100) < 90}>
          <WearableChart days={days} unit="%" domain={[80, 100]} refs={[{ y: 90, label: "90%" }]} series={[{ key: "spo2Min", name: "Saturação", color: CHART.blue }]} />
        </Chart>
      )}

      {(has("irregularRhythmEvents") || !imported) && (
        <Chart title="Batimento irregular" value={irregular.reduce((n, d) => n + (d.irregularRhythmEvents ?? 0), 0)} unit="episódios em 90 dias">
          <WearableChart days={days} unit="episódios" kind="bar" domain={[0, "auto"]} defaultRange={90} series={[{ key: "irregularRhythmEvents", name: "Episódios", color: CHART.out }]} />
          {irregular.length > 0 && (
            <p className="num px-2 pt-2 text-sm text-muted">
              Dias com registro: {irregular.slice(0, 6).map((d) => `${formatDate(d.date, { day: "2-digit", month: "2-digit" })} (${d.irregularRhythmEvents})`).join(", ")}
            </p>
          )}
        </Chart>
      )}

      {has("sleepHours") && (
        <Chart title="Sono" value={w.sleepHours} decimals={1} unit={`horas por noite, média de 7 dias${until}`}>
          <WearableChart days={days} unit="h" kind="bar" domain={[0, 10]} series={[{ key: "sleepHours", name: "Sono", color: CHART.night }]} />
        </Chart>
      )}

      {has("hrvMs") && (
        <Chart title="Variabilidade cardíaca" value={w.hrvMs} unit={`ms, média de 7 dias${until}`}>
          <WearableChart days={days} unit="ms" series={[{ key: "hrvMs", name: "VFC", color: CHART.band }]} />
        </Chart>
      )}

      {has("steps") && (
        <Chart title="Passos" value={w.steps} unit={`por dia, média de 7 dias${until}`}>
          <WearableChart days={days} unit="passos" kind="bar" domain={[0, "auto"]} series={[{ key: "steps", name: "Passos", color: CHART.sage }]} />
        </Chart>
      )}

      <Disclaimer />
    </div>
  );
}

function Chart({ title, value, second, decimals = 0, unit, warn, children }: { title: string; value: number | null; second?: number | null; decimals?: number; unit: string; warn?: boolean; children: React.ReactNode }) {
  const format = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  return (
    <section className="mt-10">
      <h2 className="text-xl font-medium tracking-[-0.02em]">{title}</h2>
      <p className="mt-1 flex items-baseline gap-2">
        <span className={`big-num ${warn ? "text-warn" : "text-ink"}`} aria-label={value == null ? "sem medição na última semana" : second != null ? `${value} por ${second}` : fmt(value)}>
          {value == null ? "—" : <NumberFlow value={value} locales="pt-BR" format={format} />}
          {second != null && (
            <>
              /<NumberFlow value={second} locales="pt-BR" />
            </>
          )}
        </span>
        <span className="text-sm text-muted">{unit}</span>
      </p>
      <div className="tile mt-3 px-2">{children}</div>
    </section>
  );
}
