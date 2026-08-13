import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { ReportColumn, ReportResult, ReportRow } from "@/types/reports";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReportRowLoose = Record<string, any>;

export function fromHrms(supabase: AuthSupabaseClient, table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.schema("hrms") as any).from(table);
}

export function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function formatEmployeeName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ").trim() || "—";
}

export function emptyToNull(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function formatCurrencyInr(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function toCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function escapeCsv(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function reportToCsv(result: ReportResult): string {
  const header = result.columns.map((c) => escapeCsv(c.header)).join(",");
  const lines = result.rows.map((row) =>
    result.columns.map((c) => escapeCsv(toCell(row[c.key]))).join(","),
  );
  return [header, ...lines].join("\r\n");
}

/** Excel-compatible workbook (SpreadsheetML / XML spreadsheet). Opens in Excel. */
export function reportToExcelXml(result: ReportResult): string {
  const rowsXml = [
    `<Row>${result.columns
      .map((c) => `<Cell><Data ss:Type="String">${escapeXml(c.header)}</Data></Cell>`)
      .join("")}</Row>`,
    ...result.rows.map(
      (row) =>
        `<Row>${result.columns
          .map((c) => {
            const val = row[c.key];
            const isNum = typeof val === "number";
            return `<Cell><Data ss:Type="${isNum ? "Number" : "String"}">${escapeXml(
              toCell(val),
            )}</Data></Cell>`;
          })
          .join("")}</Row>`,
    ),
  ].join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escapeXml(result.title.slice(0, 31))}">
  <Table>${rowsXml}</Table>
 </Worksheet>
</Workbook>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toPdfText(value: string) {
  return value.replace(/[^\u0000-\u00FF]/g, (char) => {
    const replacements: Record<string, string> = {
      "\u2013": "-",
      "\u2014": "-",
      "\u2018": "'",
      "\u2019": "'",
      "\u201C": '"',
      "\u201D": '"',
      "\u2022": "-",
      "\u2026": "...",
      "\u20B9": "Rs",
    };
    return replacements[char] ?? "?";
  });
}

export async function reportToPdfBytes(result: ReportResult): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const landscape = result.columns.length > 6;
  const pageSize: [number, number] = landscape ? [842, 595] : [595, 842];
  let page = pdf.addPage(pageSize);
  const margin = 28;
  let y = page.getHeight() - margin;

  const drawText = (text: string, x: number, size: number, useBold = false) => {
    page.drawText(toPdfText(text), {
      x,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.1, 0.12),
      maxWidth: page.getWidth() - margin * 2,
    });
  };

  drawText(result.title, margin, 13, true);
  y -= 16;
  drawText(`Generated ${result.generatedAt} · ${result.total} rows`, margin, 8);
  y -= 18;

  const cols = result.columns;
  const usable = page.getWidth() - margin * 2;
  const colWidth = usable / Math.max(cols.length, 1);
  const fontSize = cols.length > 8 ? 6.5 : cols.length > 6 ? 7 : 8;
  const maxChars = Math.max(8, Math.floor(colWidth / (fontSize * 0.55)));

  const paintHeader = () => {
    cols.forEach((c, i) => {
      page.drawText(toPdfText(c.header).slice(0, maxChars), {
        x: margin + i * colWidth,
        y,
        size: fontSize,
        font: bold,
        color: rgb(0.2, 0.2, 0.25),
        maxWidth: colWidth - 4,
      });
    });
    y -= fontSize + 6;
  };

  paintHeader();

  for (const row of result.rows) {
    if (y < margin + 16) {
      page = pdf.addPage(pageSize);
      y = page.getHeight() - margin;
      paintHeader();
    }
    cols.forEach((c, i) => {
      page.drawText(toPdfText(toCell(row[c.key])).slice(0, maxChars), {
        x: margin + i * colWidth,
        y,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.18),
        maxWidth: colWidth - 4,
      });
    });
    y -= fontSize + 5;
  }

  return pdf.save();
}

export function buildResult(
  key: ReportResult["key"],
  title: string,
  columns: ReportColumn[],
  rows: ReportRow[],
): ReportResult {
  return {
    key,
    title,
    generatedAt: new Date().toISOString(),
    columns,
    rows,
    total: rows.length,
  };
}

export function monthKey(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonthsIso(base: Date, months: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function defaultDateRange(days = 30) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

export function computeNextRunAt(
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
  from = new Date(),
) {
  const next = new Date(from);
  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (frequency === "quarterly") {
    next.setMonth(next.getMonth() + 3);
  } else if (frequency === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  next.setHours(8, 0, 0, 0);
  return next.toISOString();
}
