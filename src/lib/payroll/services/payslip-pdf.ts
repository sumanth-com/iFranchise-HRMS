/**
 * Official payslip PDF export — visual twin of `PayslipTemplate`.
 * Used by download API, email attachments, and storage archive.
 * Do not introduce a separate PDF layout; update this file alongside the React template.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { amountToIndianWords } from "@/lib/payroll/services/amount-in-words";
import {
  PAYSLIP_DESIGN,
  PAYSLIP_WAVE_PATHS,
  payslipHexToRgb,
} from "@/lib/payroll/services/payslip-design";
import {
  formatPayslipMonthTitle,
  formatPayslipPaymentDate,
  getPayslipFooterLines,
  getPayslipInfoRows,
  getPayslipNotes,
  getPayslipPaymentDetails,
} from "@/lib/payroll/services/payslip-document-helpers";
import { loadPayslipBrandLogoBytes } from "@/lib/payroll/services/payslip-logo-cache";
import { resolvePayslipDisplayTotals } from "@/lib/payroll/services/payroll-utils";
import type { PayslipDetail } from "@/types/payroll";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const TEXT = rgb(0.1, 0.12, 0.18);
const MUTED = rgb(0.39, 0.42, 0.49);
const BORDER = rgb(0.86, 0.88, 0.91);
const ROW_LINE = rgb(0.93, 0.94, 0.96);
const WHITE = rgb(1, 1, 1);
const HIGHLIGHT = rgb(0.937, 0.918, 0.988);
const PANEL = rgb(0.973, 0.969, 0.988);

const deep = payslipHexToRgb(PAYSLIP_DESIGN.purpleDeep);
const brand = payslipHexToRgb(PAYSLIP_DESIGN.purple);
const band = payslipHexToRgb(PAYSLIP_DESIGN.purpleBand);
const section = payslipHexToRgb(PAYSLIP_DESIGN.sectionTitle);

const BRAND_DEEP = rgb(deep.r, deep.g, deep.b);
const BRAND = rgb(brand.r, brand.g, brand.b);
const BRAND_BAND = rgb(band.r, band.g, band.b);
const SECTION = rgb(section.r, section.g, section.b);

type Ctx = { pdf: PDFDocument; page: PDFPage; font: PDFFont; bold: PDFFont; y: number };

function sanitizePdfText(text: string): string {
  return text
    .replace(/\u20b9/g, "Rs. ")
    .replace(/\u2212/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u00b7/g, " - ")
    .replace(/\u2022/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"');
}

function formatAmountIndian(value: number | undefined | null): string {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function drawText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> },
) {
  const size = options?.size ?? 8.5;
  const font = options?.bold ? ctx.bold : ctx.font;
  ctx.page.drawText(sanitizePdfText(text), {
    x,
    y,
    size,
    font,
    color: options?.color ?? TEXT,
  });
}

function drawRight(
  ctx: Ctx,
  text: string,
  rightX: number,
  y: number,
  options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> },
) {
  const size = options?.size ?? 8.5;
  const font = options?.bold ? ctx.bold : ctx.font;
  const safeText = sanitizePdfText(text);
  drawText(ctx, safeText, rightX - font.widthOfTextAtSize(safeText, size), y, options);
}

function measure(ctx: Ctx, text: string, size: number, bold = false): number {
  const font = bold ? ctx.bold : ctx.font;
  return font.widthOfTextAtSize(sanitizePdfText(text), size);
}

function wrapText(
  ctx: Ctx,
  text: string,
  maxWidth: number,
  size: number,
  bold = false,
): string[] {
  const safe = sanitizePdfText(text);
  const words = safe.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = `${current} ${words[i]}`;
    if (measure(ctx, next, size, bold) <= maxWidth) current = next;
    else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);

  return lines.flatMap((line) => {
    if (measure(ctx, line, size, bold) <= maxWidth) return [line];
    const chunks: string[] = [];
    let chunk = "";
    for (const char of line) {
      const trial = chunk + char;
      if (measure(ctx, trial, size, bold) <= maxWidth) chunk = trial;
      else {
        if (chunk) chunks.push(chunk);
        chunk = char;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks.length ? chunks : [line];
  });
}

function drawWrapped(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; lineHeight?: number },
): number {
  const size = options?.size ?? 8.5;
  const lineHeight = options?.lineHeight ?? size + 2.5;
  const lines = wrapText(ctx, text, maxWidth, size, options?.bold);
  lines.forEach((line, index) => {
    drawText(ctx, line, x, y - index * lineHeight, options);
  });
  return lines.length * lineHeight;
}

function sectionTitle(ctx: Ctx, title: string, y: number): number {
  drawText(ctx, title, MARGIN, y, { size: 10, bold: true, color: SECTION });
  return y - 16;
}

function drawRightSideWaves(
  ctx: Ctx,
  bandBottom: number,
  bandHeight: number,
  mirror = false,
) {
  const waveWidth = PAGE_WIDTH * 0.48;
  const scale = waveWidth / 360;
  const originX = PAGE_WIDTH - waveWidth;

  PAYSLIP_WAVE_PATHS.forEach((wave) => {
    try {
      ctx.page.drawSvgPath(wave.d, {
        x: originX,
        y: mirror ? bandBottom + bandHeight : bandBottom,
        scale,
        color: WHITE,
        opacity: wave.opacity,
        borderWidth: 0,
        // pdf-lib SVG y grows downward from origin; mirror by flipping via negative scaleY isn't supported —
        // for footer we draw the same paths which still read as soft right-side ribbons.
      });
    } catch {
      // Decorative only — never fail PDF generation
    }
  });
}

export async function generatePayslipPdfBytes(payslip: PayslipDetail): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const ctx: Ctx = { pdf, page, font, bold, y: PAGE_HEIGHT };

  const monthTitle = formatPayslipMonthTitle(payslip.payrollMonth);
  const paymentDate = formatPayslipPaymentDate(payslip);
  const infoRows = getPayslipInfoRows(payslip);
  const paymentDetails = getPayslipPaymentDetails(payslip);
  const notes = getPayslipNotes(payslip);
  const footer = getPayslipFooterLines(payslip);

  const { earnings, deductions, grossEarnings, totalDeductions, netPay } =
    resolvePayslipDisplayTotals({
      breakdown: payslip.breakdown,
      basicSalary: payslip.basicSalary,
      totalAllowances: payslip.totalAllowances,
      grossSalary: payslip.grossSalary,
      totalDeductions: payslip.totalDeductions,
      employmentType: payslip.employee.employmentType,
    });

  // ── Header (matches PayslipTemplate) ────────────────────────────────
  const headerH = 102;
  const headerBottom = PAGE_HEIGHT - headerH;
  ctx.page.drawRectangle({
    x: 0,
    y: headerBottom,
    width: PAGE_WIDTH,
    height: headerH,
    color: BRAND_DEEP,
  });
  ctx.page.drawRectangle({
    x: PAGE_WIDTH * 0.35,
    y: headerBottom,
    width: PAGE_WIDTH * 0.65,
    height: headerH,
    color: BRAND,
    opacity: 0.45,
  });
  drawRightSideWaves(ctx, headerBottom, headerH);

  const logoBytes = await loadPayslipBrandLogoBytes();
  let textLeft = MARGIN;
  if (logoBytes) {
    try {
      let image: Awaited<ReturnType<PDFDocument["embedPng"]>>;
      try {
        image = await ctx.pdf.embedPng(logoBytes);
      } catch {
        image = await ctx.pdf.embedJpg(logoBytes);
      }
      const maxW = 40;
      const maxH = 40;
      const scale = Math.min(maxW / image.width, maxH / image.height);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      const logoX = MARGIN;
      const logoY = PAGE_HEIGHT - 54;
      ctx.page.drawImage(image, {
        x: logoX,
        y: logoY,
        width: drawW,
        height: drawH,
      });
      textLeft = MARGIN + drawW + 10;
    } catch {
      // Optional logo fallback
    }
  }

  drawText(ctx, PAYSLIP_DESIGN.brandName, textLeft, PAGE_HEIGHT - 30, {
    size: 14,
    bold: true,
    color: WHITE,
  });
  drawText(ctx, PAYSLIP_DESIGN.brandTagline, textLeft, PAGE_HEIGHT - 44, {
    size: 6.5,
    bold: true,
    color: rgb(0.92, 0.9, 1),
  });
  drawText(
    ctx,
    `Payslip no. ${payslip.payslipNumber}  /  Payment date ${paymentDate}`,
    MARGIN,
    PAGE_HEIGHT - 78,
    { size: 8, color: rgb(0.9, 0.88, 1) },
  );

  drawRight(ctx, "PAYSLIP", PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 34, {
    size: 20,
    bold: true,
    color: WHITE,
  });
  drawRight(ctx, monthTitle, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 52, {
    size: 10,
    bold: true,
    color: WHITE,
  });

  let y = headerBottom - 18;

  // ── Employee information ────────────────────────────────────────────
  y = sectionTitle(ctx, "Employee information", y);

  const infoColW = CONTENT_WIDTH / 3;
  const infoPad = 8;
  const infoLabelSize = 6.5;
  const infoValueSize = 8.5;
  const infoRowTop = y + 8;
  const infoRowHeights: number[] = [];

  for (const row of infoRows) {
    const lineCounts = row.map(
      (cell) => wrapText(ctx, cell.value, infoColW - infoPad * 2, infoValueSize, true).length,
    );
    const contentH =
      8 + infoLabelSize + 4 + Math.max(...lineCounts, 1) * (infoValueSize + 2) + 8;
    infoRowHeights.push(Math.max(34, contentH));
  }

  const infoBoxH = infoRowHeights.reduce((sum, h) => sum + h, 0);
  const infoBoxBottom = infoRowTop - infoBoxH;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: infoBoxBottom,
    width: CONTENT_WIDTH,
    height: infoBoxH,
    borderColor: BORDER,
    borderWidth: 1,
  });
  ctx.page.drawLine({
    start: { x: MARGIN + infoColW, y: infoRowTop },
    end: { x: MARGIN + infoColW, y: infoBoxBottom },
    thickness: 1,
    color: BORDER,
  });
  ctx.page.drawLine({
    start: { x: MARGIN + infoColW * 2, y: infoRowTop },
    end: { x: MARGIN + infoColW * 2, y: infoBoxBottom },
    thickness: 1,
    color: BORDER,
  });

  let rowY = infoRowTop;
  infoRows.forEach((row, rowIndex) => {
    const rowH = infoRowHeights[rowIndex];
    const rowBottom = rowY - rowH;
    if (rowIndex < infoRows.length - 1) {
      ctx.page.drawLine({
        start: { x: MARGIN, y: rowBottom },
        end: { x: MARGIN + CONTENT_WIDTH, y: rowBottom },
        thickness: 1,
        color: BORDER,
      });
    }
    const labelY = rowY - 12;
    const valueY = labelY - 12;
    row.forEach((cell, cellIndex) => {
      const x = MARGIN + infoColW * cellIndex + infoPad;
      drawText(ctx, cell.label.toUpperCase(), x, labelY, {
        size: infoLabelSize,
        bold: true,
        color: MUTED,
      });
      drawWrapped(ctx, cell.value, x, valueY, infoColW - infoPad * 2, {
        size: infoValueSize,
        bold: true,
        lineHeight: infoValueSize + 2,
      });
    });
    rowY = rowBottom;
  });

  y = infoBoxBottom - 20;

  // ── Earnings and deductions ─────────────────────────────────────────
  y = sectionTitle(ctx, "Earnings and deductions", y);

  const c1 = MARGIN;
  const c1W = CONTENT_WIDTH * 0.32;
  const c2 = c1 + c1W;
  const c2W = CONTENT_WIDTH * 0.18;
  const c3 = c2 + c2W;
  const c3W = CONTENT_WIDTH * 0.32;
  const c4 = c3 + c3W;
  const rowH = 18;
  const headerRowH = 20;
  const maxRows = Math.max(earnings.length, deductions.length, 1);
  const tableH = headerRowH + maxRows * rowH + rowH;
  const tableTop = y + 6;
  const tableBottom = tableTop - tableH;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: tableBottom,
    width: CONTENT_WIDTH,
    height: tableH,
    borderColor: BORDER,
    borderWidth: 1,
  });
  ctx.page.drawRectangle({
    x: MARGIN + 0.5,
    y: tableTop - headerRowH,
    width: CONTENT_WIDTH - 1,
    height: headerRowH,
    color: BRAND_BAND,
  });

  const drawV = (x: number, top: number, bottom: number) => {
    ctx.page.drawLine({
      start: { x, y: top },
      end: { x, y: bottom },
      thickness: 1,
      color: BORDER,
    });
  };
  drawV(c2, tableTop, tableBottom);
  drawV(c3, tableTop, tableBottom);
  drawV(c4, tableTop, tableBottom);

  const headTextY = tableTop - 13;
  drawText(ctx, "EARNINGS", c1 + 8, headTextY, { size: 7.5, bold: true, color: WHITE });
  drawRight(ctx, "AMOUNT (Rs.)", c3 - 8, headTextY, { size: 7.5, bold: true, color: WHITE });
  drawText(ctx, "DEDUCTIONS", c3 + 8, headTextY, { size: 7.5, bold: true, color: WHITE });
  drawRight(ctx, "AMOUNT (Rs.)", MARGIN + CONTENT_WIDTH - 8, headTextY, {
    size: 7.5,
    bold: true,
    color: WHITE,
  });

  let lineY = tableTop - headerRowH;
  ctx.page.drawLine({
    start: { x: MARGIN, y: lineY },
    end: { x: MARGIN + CONTENT_WIDTH, y: lineY },
    thickness: 1,
    color: BORDER,
  });

  for (let i = 0; i < maxRows; i++) {
    const bottom = lineY - rowH;
    ctx.page.drawLine({
      start: { x: MARGIN, y: bottom },
      end: { x: MARGIN + CONTENT_WIDTH, y: bottom },
      thickness: 0.6,
      color: ROW_LINE,
    });
    const earning = earnings[i];
    const deduction = deductions[i];
    const textY = bottom + 5;
    if (earning) {
      const label = wrapText(ctx, earning.label, c1W - 14, 8)[0] ?? earning.label;
      drawText(ctx, label, c1 + 8, textY, { size: 8 });
      drawRight(ctx, formatAmountIndian(earning.amount), c3 - 8, textY, { size: 8 });
    }
    if (deduction) {
      const label = wrapText(ctx, deduction.label, c3W - 14, 8)[0] ?? deduction.label;
      drawText(ctx, label, c3 + 8, textY, { size: 8 });
      drawRight(ctx, formatAmountIndian(deduction.amount), MARGIN + CONTENT_WIDTH - 8, textY, {
        size: 8,
      });
    }
    lineY = bottom;
  }

  ctx.page.drawRectangle({
    x: MARGIN + 0.5,
    y: tableBottom,
    width: CONTENT_WIDTH - 1,
    height: rowH,
    color: HIGHLIGHT,
  });
  drawV(c2, lineY, tableBottom);
  drawV(c3, lineY, tableBottom);
  drawV(c4, lineY, tableBottom);
  const totalTextY = tableBottom + 5;
  drawText(ctx, "Gross earnings", c1 + 8, totalTextY, { size: 8.5, bold: true });
  drawRight(ctx, formatAmountIndian(grossEarnings), c3 - 8, totalTextY, { size: 8.5, bold: true });
  drawText(ctx, "Total deductions", c3 + 8, totalTextY, { size: 8.5, bold: true });
  drawRight(ctx, formatAmountIndian(totalDeductions), MARGIN + CONTENT_WIDTH - 8, totalTextY, {
    size: 8.5,
    bold: true,
  });

  y = tableBottom - 16;

  // ── Net pay formula ─────────────────────────────────────────────────
  const netFormula = `Rs. ${formatAmountIndian(grossEarnings)} (Gross Earnings) - Rs. ${formatAmountIndian(totalDeductions)} (Deductions) = Rs. ${formatAmountIndian(netPay)} (Net Pay)`;
  const netLines = wrapText(ctx, netFormula, CONTENT_WIDTH - 28, 9, true);
  const netH = Math.max(40, 16 + netLines.length * 13);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: y - netH,
    width: CONTENT_WIDTH,
    height: netH,
    color: BRAND,
  });
  netLines.forEach((line, index) => {
    const lineWidth = measure(ctx, line, 9, true);
    drawText(ctx, line, MARGIN + (CONTENT_WIDTH - lineWidth) / 2, y - 16 - index * 13, {
      size: 9,
      bold: true,
      color: WHITE,
    });
  });
  y = y - netH - 14;

  const wordsPrefix = "Amount in words ";
  drawText(ctx, wordsPrefix, MARGIN, y, { size: 9, bold: true });
  const prefixW = measure(ctx, wordsPrefix, 9, true);
  const wordsHeight = drawWrapped(
    ctx,
    amountToIndianWords(netPay),
    MARGIN + prefixW,
    y,
    CONTENT_WIDTH - prefixW,
    { size: 9, lineHeight: 12 },
  );
  y -= Math.max(14, wordsHeight) + 12;

  // ── Payment details ─────────────────────────────────────────────────
  const payH = 46;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: y - payH,
    width: CONTENT_WIDTH,
    height: payH,
    color: PANEL,
    borderColor: BORDER,
    borderWidth: 1,
  });
  const payColW = CONTENT_WIDTH / 3;
  paymentDetails.forEach((detail, index) => {
    const x = MARGIN + payColW * index + 10;
    drawText(ctx, detail.label.toUpperCase(), x, y - 14, {
      size: 7,
      bold: true,
      color: MUTED,
    });
    drawWrapped(ctx, detail.value, x, y - 30, payColW - 18, {
      size: 9,
      bold: true,
      lineHeight: 11,
    });
  });
  y = y - payH - 16;

  // ── Notes ───────────────────────────────────────────────────────────
  y = sectionTitle(ctx, "Notes", y);
  notes.forEach((note, index) => {
    const used = drawWrapped(ctx, `${index + 1}. ${note}`, MARGIN, y, CONTENT_WIDTH, {
      size: 8,
      color: MUTED,
      lineHeight: 11,
    });
    y -= used + 4;
  });

  // ── Footer ──────────────────────────────────────────────────────────
  const footerH = 84;
  ctx.page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: footerH,
    color: BRAND_DEEP,
  });
  ctx.page.drawRectangle({
    x: PAGE_WIDTH * 0.35,
    y: 0,
    width: PAGE_WIDTH * 0.65,
    height: footerH,
    color: BRAND,
    opacity: 0.45,
  });
  drawRightSideWaves(ctx, 0, footerH, true);

  drawText(ctx, footer.companyName, MARGIN, footerH - 16, {
    size: 9,
    bold: true,
    color: WHITE,
  });
  drawRight(ctx, "PRIVATE - CONFIDENTIAL", PAGE_WIDTH - MARGIN, footerH - 16, {
    size: 7.5,
    bold: true,
    color: rgb(0.9, 0.88, 1),
  });

  let footerY = footerH - 30;
  footer.addressLines.forEach((line) => {
    drawText(ctx, line, MARGIN, footerY, {
      size: 7.5,
      color: rgb(0.9, 0.88, 1),
    });
    footerY -= 11;
  });
  if (footer.contactLine) {
    drawText(ctx, footer.contactLine, MARGIN, footerY, {
      size: 7.5,
      color: rgb(0.86, 0.84, 0.98),
    });
  }

  return pdf.save();
}
