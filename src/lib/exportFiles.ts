/**
 * Baixar o histórico como planilha do Excel (.xlsx) e como PDF, tudo gerado no
 * navegador (o site é estático, sem servidor). A planilha é montada à mão no
 * formato Office Open XML e compactada com o fflate; o PDF usa o pdf-lib,
 * carregado só quando a pessoa pede o arquivo.
 */
import { strToU8, zipSync } from "fflate";
import { ageFrom, formatDate } from "./dates";
import { fmt, labStatus } from "./health";
import type { Db } from "./types";

type Cell = string | number | null | undefined;
export type Sheet = { name: string; header: string[]; rows: Cell[][] };

type HistoryDb = Pick<Db, "patient" | "labResults" | "medications" | "vaccines" | "encounters">;

const STATUS: Record<string, string> = { alto: "Alto", baixo: "Baixo", normal: "Normal", sem_faixa: "" };
const date = (iso?: string | null) => (iso ? formatDate(iso) : "");
const ref = (lo?: number | null, hi?: number | null, text?: string) =>
  lo != null && hi != null ? `${fmt(lo)} a ${fmt(hi)}` : lo != null ? `≥ ${fmt(lo)}` : hi != null ? `≤ ${fmt(hi)}` : (text ?? "");

/** As mesmas tabelas servem para a planilha (uma aba cada) e para o PDF (uma seção cada). */
export function historySheets(db: HistoryDb): Sheet[] {
  const p = db.patient;
  const exams = [...db.labResults].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  return [
    {
      name: "Perfil",
      header: ["Campo", "Valor"],
      rows: [
        ["Nome", p.name],
        ["Nascimento", p.birthDate ? `${date(p.birthDate)} (${ageFrom(p.birthDate)} anos)` : ""],
        ["Sexo", p.sex === "F" ? "Feminino" : "Masculino"],
        ["Tipo sanguíneo", p.bloodType ?? "Não informado"],
        ["Alergias", p.allergies.join(", ") || "Nenhuma conhecida"],
        ["Contato de emergência", p.emergencyContact ? `${p.emergencyContact.name} · ${p.emergencyContact.phone}` : ""],
      ],
    },
    {
      name: "Exames",
      header: ["Data", "Exame", "Valor", "Unidade", "Referência", "Situação", "Laboratório"],
      rows: exams.map((r) => [
        date(r.date),
        r.name,
        r.value ?? r.valueText ?? "",
        r.unit,
        ref(r.refLow, r.refHigh, r.refText),
        STATUS[labStatus(r)] ?? "",
        r.lab ?? "",
      ]),
    },
    {
      name: "Remédios",
      header: ["Remédio", "Dose", "Frequência", "Início", "Fim", "Motivo"],
      rows: db.medications.map((m) => [m.name, m.dose, m.frequency, date(m.startDate), m.endDate ? date(m.endDate) : "Em uso", m.reason ?? ""]),
    },
    {
      name: "Vacinas",
      header: ["Data", "Vacina", "Dose"],
      rows: [...db.vaccines].sort((a, b) => b.date.localeCompare(a.date)).map((v) => [date(v.date), v.name, v.dose ?? ""]),
    },
    {
      name: "Consultas",
      header: ["Data", "Especialidade", "Profissional", "Local", "Motivo"],
      rows: [...db.encounters].sort((a, b) => b.date.localeCompare(a.date)).map((e) => [date(e.date), e.specialty, e.professional, e.place, e.reason]),
    },
  ];
}

// ---------- Excel (.xlsx) ----------

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colName = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

function cellXml(v: Cell, ref: string, bold = false): string {
  if (v == null || v === "") return "";
  const style = bold ? ' s="1"' : "";
  if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${style}><v>${v}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(String(v))}</t></is></c>`;
}

function sheetXml(s: Sheet): string {
  const all = [s.header, ...s.rows];
  const widths = s.header.map((_, c) => Math.min(60, Math.max(10, ...all.map((r) => String(r[c] ?? "").length + 2))));
  const rows = all
    .map((r, i) => `<row r="${i + 1}">${r.map((v, c) => cellXml(v, `${colName(c)}${i + 1}`, i === 0)).join("")}</row>`)
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` +
    `<sheetData>${rows}</sheetData></worksheet>`
  );
}

export function buildXlsx(sheets: Sheet[]): Blob {
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
        `</Types>`,
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
        sheets.map((s, i) => `<sheet name="${xml(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
        `</sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
        `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    "xl/styles.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
        `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
        `<borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>` +
        `<cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`,
    ),
  };
  sheets.forEach((s, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s))));
  return new Blob([zipSync(files) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// ---------- PDF ----------

/** A fonte padrão do PDF (Helvetica) só tem os caracteres do Windows-1252: troca o resto. */
const pdfText = (s: string) =>
  s
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/μ/g, "µ")
    .replace(/[‐-―]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g, "");

export async function buildPdf(db: HistoryDb): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(`Histórico de saúde · ${db.patient.name}`);
  doc.setCreator("Elo Saúde");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.12, 0.17, 0.3);
  const muted = rgb(0.39, 0.42, 0.51);
  const line = rgb(0.89, 0.89, 0.87);

  const W = 595.28;
  const H = 841.89;
  const M = 40;
  let page = doc.addPage([W, H]);
  let y = H - M;

  const fit = (s: string, size: number, max: number, f = font) => {
    let t = pdfText(s);
    if (f.widthOfTextAtSize(t, size) <= max) return t;
    while (t.length > 1 && f.widthOfTextAtSize(`${t}…`, size) > max) t = t.slice(0, -1);
    return `${t}…`;
  };
  const text = (s: string, x: number, size: number, f = font, color = ink, max = W - M - x) =>
    page.drawText(fit(s, size, max, f), { x, y, size, font: f, color });
  const ensure = (h: number) => {
    if (y - h >= M + 20) return false;
    page = doc.addPage([W, H]);
    y = H - M;
    return true;
  };

  // Cabeçalho
  text("Histórico de saúde", M, 20, bold);
  y -= 18;
  text(`Gerado pelo Elo Saúde em ${formatDate(new Date().toISOString().slice(0, 10))}. Dados informados pelo paciente; confira com os laudos originais.`, M, 9, font, muted);
  y -= 22;

  for (const s of historySheets(db)) {
    ensure(60);
    text(s.name, M, 14, bold);
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: line });
    y -= 14;
    if (!s.rows.length) {
      text("Nenhum registro.", M, 10, font, muted);
      y -= 22;
      continue;
    }
    // Larguras proporcionais ao conteúdo de cada coluna, cabendo na página
    const all = [s.header, ...s.rows];
    // O nome (exame, remédio, vacina) ganha mais espaço; colunas longas como laboratório são cortadas
    const main = (h: string) => h === "Exame" || h === "Remédio" || h === "Vacina" || (s.name === "Perfil" && h === "Valor");
    const raw = s.header.map((h, c) => Math.max(h.length + 3, 12, Math.min(main(h) ? 34 : 20, Math.max(...all.map((r) => String(r[c] ?? "").length)))));
    const total = raw.reduce((a, b) => a + b, 0);
    const cols = raw.map((w) => ((W - 2 * M) * w) / total);
    const xs = cols.map((_, i) => M + cols.slice(0, i).reduce((a, b) => a + b, 0));
    const header = () => {
      s.header.forEach((h, c) => text(h, xs[c], 8.5, bold, muted, cols[c] - 6));
      y -= 14;
    };
    header();
    for (const r of s.rows) {
      if (ensure(16)) header();
      r.forEach((v, c) => text(typeof v === "number" ? fmt(v) : String(v ?? ""), xs[c], 9, font, ink, cols[c] - 6));
      y -= 13;
    }
    y -= 14;
  }

  // Rodapé com número da página
  const pages = doc.getPages();
  pages.forEach((p, i) =>
    p.drawText(pdfText(`Elo Saúde · ${db.patient.name} · página ${i + 1} de ${pages.length}`), { x: M, y: 22, size: 8, font, color: muted }),
  );
  return new Blob([(await doc.save()) as BlobPart], { type: "application/pdf" });
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
