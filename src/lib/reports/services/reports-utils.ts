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

export async function reportToPdfBytes(result: ReportResult): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([842, 595]); // landscape A4
  const margin = 36;
  let y = page.getHeight() - margin;

  const drawText = (text: string, x: number, size: number, useBold = false) => {
    page.drawText(text.slice(0, 120), {
      x,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.1, 0.12),
    });
  };

  drawText(result.title, margin, 14, true);
  y -= 18;
  drawText(`Generated ${result.generatedAt} · ${result.total} rows`, margin, 9);
  y -= 22;

  const colCount = Math.min(result.columns.length, 8);
  const usable = page.getWidth() - margin * 2;
  const colWidth = usable / colCount;
  const cols = result.columns.slice(0, colCount);

  const paintHeader = () => {
    cols.forEach((c, i) => {
      page.drawText(c.header.slice(0, 18), {
        x: margin + i * colWidth,
        y,
        size: 8,
        font: bold,
        color: rgb(0.2, 0.2, 0.25),
      });
    });
    y -= 14;
  };

  paintHeader();

  for (const row of result.rows.slice(0, 40)) {
    if (y < margin + 20) {
      page = pdf.addPage([842, 595]);
      y = page.getHeight() - margin;
      paintHeader();
    }
    cols.forEach((c, i) => {
      page.drawText(toCell(row[c.key]).slice(0, 22), {
        x: margin + i * colWidth,
        y,
        size: 8,
        font,
        color: rgb(0.15, 0.15, 0.18),
      });
    });
    y -= 12;
  }

  if (result.rows.length > 40) {
    y -= 8;
    drawText(`…and ${result.rows.length - 40} more rows. Export CSV/Excel for full data.`, margin, 8);
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

export function computeNextRunAt(frequency: "daily" | "weekly" | "monthly", from = new Date()) {
  const next = new Date(from);
  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
  } else if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  next.setHours(8, 0, 0, 0);
  return next.toISOString();
}
