"use client";

import { CalendarIcon, ChevronDown } from "./icons";

/** Botão compacto que abre e fecha a escolha de período. */
export function PeriodButton({ text, active, open, onToggle, controls }: { text: string; active: boolean; open: boolean; onToggle: () => void; controls: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${active ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink hover:border-ink"}`}
    >
      <CalendarIcon width={16} /> {text} <ChevronDown width={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}
