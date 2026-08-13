import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";

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

function wrapPdfLines(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (t: string, size: number) => number },
  fontSize: number,
  maxLines: number,
): string[] {
  const cleaned = toPdfText(text).replace(/\s+/g, " ").trim();
  if (!cleaned) return ["—"];

  const fits = (value: string) => font.widthOfTextAtSize(value, fontSize) <= maxWidth;

  const hardSplit = (token: string): string[] => {
    const parts: string[] = [];
    let chunk = "";
    for (const ch of token) {
      const next = chunk + ch;
      if (!chunk || fits(next)) {
        chunk = next;
      } else {
        parts.push(chunk);
        chunk = ch;
      }
    }
    if (chunk) parts.push(chunk);
    return parts;
  };

  const tokens = cleaned.split(" ").flatMap((word) => (fits(word) ? [word] : hardSplit(word)));
  const lines: string[] = [];
  let current = "";

  for (const token of tokens) {
    const candidate = current ? `${current} ${token}` : token;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = token;
    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  // Ellipsis on last line when content was truncated
  const consumed = lines.join(" ");
  if (consumed.length < cleaned.length && lines.length > 0) {
    const lastIdx = lines.length - 1;
    let last = lines[lastIdx]!;
    while (last.length > 1 && !fits(`${last}...`)) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lastIdx] = `${last}...`;
  }

  return lines.length > 0 ? lines : ["—"];
}

function formatPdfGeneratedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export async function reportToPdfBytes(result: ReportResult): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cols = result.columns;
  const landscape = cols.length > 5;
  const pageSize: [number, number] = landscape ? [842, 595] : [595, 842];
  let page = pdf.addPage(pageSize);
  const marginX = 36;
  const marginY = 32;
  const usableWidth = page.getWidth() - marginX * 2;
  let y = page.getHeight() - marginY;

  const weightSum = cols.reduce((sum, c) => sum + (c.width ?? 1), 0);
  const colWidths = cols.map((c) => ((c.width ?? 1) / weightSum) * usableWidth);
  const fontSize = cols.length > 8 ? 7 : cols.length > 6 ? 7.5 : 8.5;
  const lineHeight = fontSize + 2.5;
  const cellPadX = 4;
  const maxLinesPerCell = cols.length > 7 ? 2 : 3;

  const drawTitle = () => {
    page.drawText(toPdfText(result.title), {
      x: marginX,
      y,
      size: 14,
      font: bold,
      color: rgb(0.1, 0.1, 0.12),
    });
    y -= 16;
    page.drawText(
      toPdfText(`Generated ${formatPdfGeneratedAt(result.generatedAt)}  ·  ${result.total} rows`),
      {
        x: marginX,
        y,
        size: 8,
        font,
        color: rgb(0.35, 0.35, 0.4),
      },
    );
    y -= 14;
  };

  const paintHeader = () => {
    const headerHeight = lineHeight + 8;
    page.drawRectangle({
      x: marginX,
      y: y - headerHeight + 4,
      width: usableWidth,
      height: headerHeight,
      color: rgb(0.93, 0.94, 0.96),
    });

    let x = marginX;
    cols.forEach((c, i) => {
      const width = colWidths[i]!;
      page.drawText(toPdfText(c.header), {
        x: x + cellPadX,
        y: y - fontSize,
        size: fontSize,
        font: bold,
        color: rgb(0.2, 0.22, 0.28),
        maxWidth: width - cellPadX * 2,
      });
      x += width;
    });
    y -= headerHeight + 2;
  };

  drawTitle();
  paintHeader();

  let rowIndex = 0;
  for (const row of result.rows) {
    const cellLines = cols.map((c, i) =>
      wrapPdfLines(
        toCell(row[c.key]),
        Math.max(12, colWidths[i]! - cellPadX * 2),
        font,
        fontSize,
        maxLinesPerCell,
      ),
    );
    const rowLines = Math.max(1, ...cellLines.map((lines) => lines.length));
    const rowHeight = rowLines * lineHeight + 6;

    if (y - rowHeight < marginY) {
      page = pdf.addPage(pageSize);
      y = page.getHeight() - marginY;
      drawTitle();
      paintHeader();
    }

    if (rowIndex % 2 === 1) {
      page.drawRectangle({
        x: marginX,
        y: y - rowHeight + 2,
        width: usableWidth,
        height: rowHeight,
        color: rgb(0.97, 0.98, 0.99),
      });
    }

    let x = marginX;
    cellLines.forEach((lines, i) => {
      const width = colWidths[i]!;
      lines.forEach((line, lineIdx) => {
        page.drawText(line, {
          x: x + cellPadX,
          y: y - fontSize - lineIdx * lineHeight,
          size: fontSize,
          font,
          color: rgb(0.15, 0.15, 0.18),
          maxWidth: width - cellPadX * 2,
        });
      });
      x += width;
    });

    y -= rowHeight;
    rowIndex += 1;
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
