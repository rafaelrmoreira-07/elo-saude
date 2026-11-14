"use client";

import { useState } from "react";
import { PERIOD_PRESETS, presetPeriod, type Period, type PeriodPreset } from "@/lib/period";
import { todayISO } from "@/lib/dates";
import { SlidingTabs } from "./SlidingTabs";

/**
 * Escolha de período: atalhos (tudo, 12 meses, 2 anos) ou datas de início e fim
 * escolhidas pela pessoa. `extra` acrescenta atalhos próprios (ex.: 14, 30, 90 dias nos gráficos).
 */
export function PeriodPicker({
  label,
  onChange,
  presets = PERIOD_PRESETS,
  initial = "tudo",
  initialPeriod,
  resolve = (k) => presetPeriod(k as PeriodPreset),
  min,
}: {
  label: string;
  onChange: (p: Period, key: string) => void;
  presets?: { key: string; label: string }[];
  initial?: string;
  /** Datas já escolhidas (quando o seletor reaparece em outro lugar da tela). */
  initialPeriod?: Period;
  resolve?: (key: string) => Period;
  /** Data mais antiga com dados, para limitar o calendário. */
  min?: string;
}) {
  const [key, setKey] = useState(initial);
  const [from, setFrom] = useState(initial === "personalizado" ? initialPeriod?.from ?? "" : "");
  const [to, setTo] = useState(initial === "personalizado" ? initialPeriod?.to ?? "" : "");
  const max = todayISO();
  const custom = key === "personalizado";

  const apply = (f: string, t: string) => onChange({ from: f || undefined, to: t || undefined }, "personalizado");

  return (
    <div className="space-y-2">
      <SlidingTabs
        label={label}
        active={key}
        onChange={(k) => {
          setKey(k);
          if (k === "personalizado") apply(from, to);
          else onChange(resolve(k), k);
        }}
        items={presets}
      />
      {custom && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label">De</span>
            <input
              type="date"
              className="input num"
              value={from}
              min={min}
              max={to || max}
              onChange={(e) => {
                setFrom(e.target.value);
                apply(e.target.value, to);
              }}
            />
          </label>
          <label className="block">
            <span className="label">Até</span>
            <input
              type="date"
              className="input num"
              value={to}
              min={from || min}
              max={max}
              onChange={(e) => {
                setTo(e.target.value);
                apply(from, e.target.value);
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
