import { readFile } from "node:fs/promises";
import path from "node:path";

import { format, parseISO } from "date-fns";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { amountToIndianWords } from "@/lib/payroll/services/amount-in-words";
import { formatPayslipDisplayAddress } from "@/lib/payroll/services/payslip-branding";
import { PAYSLIP_ENGINE_NAME } from "@/lib/payroll/services/payslip-publication";
import {
  formatPayrollMonthLabel,
  formatPayslipCurrency,
} from "@/lib/payroll/services/payroll-utils";
import type { PayslipDetail, PayrollBreakdownLine } from "@/types/payroll";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ACCENT = rgb(0.357, 0.129, 0.714);
const TEXT = rgb(0.12, 0.13, 0.15);
const MUTED = rgb(0.45, 0.47, 0.5);
const LINE = rgb(0.88, 0.89, 0.91);
const PANEL = rgb(0.97, 0.97, 0.98);

type Ctx = { pdf: PDFDocument; page: PDFPage; font: PDFFont; bold: PDFFont; y: number };

/** Standard PDF fonts only support WinAnsi — normalize currency and punctuation. */
function sanitizePdfText(text: string): string {
  return text
    .replace(/\u20b9/g, "Rs. ")
    .replace(/\u00a0/g, " ")
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u00b7/g, " - ")
    .replace(/\u2026/g, "...")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"');
}

function pdfMoney(value: number, currencyCode: string): string {
  return sanitizePdfText(formatPayslipCurrency(value, currencyCode));
}

function truncateText(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number,
): string {
  const safe = sanitizePdfText(text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  const ellipsis = "...";
  let trimmed = safe;
  while (trimmed.length > 0 && font.widthOfTextAtSize(trimmed + ellipsis, size) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.length > 0 ? trimmed + ellipsis : ellipsis;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    return format(parseISO(value.length === 10 ? value : value.slice(0, 10)), "dd MMM yyyy");
  } catch {
    return "-";
  }
}

async function loadLogoBytes(logoUrl: string | null): Promise<Uint8Array | null> {
  if (!logoUrl) return null;
  if (logoUrl.startsWith("/")) {
    const publicPath = path.join(process.cwd(), "public", logoUrl.replace(/^\//, ""));
    try {
      return await readFile(publicPath);
    } catch {
      try {
        return await readFile(path.join(process.cwd(), "src/assets/Logo.png"));
      } catch {
        return null;
      }
    }
  }
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function ensureSpace(ctx: Ctx, height: number) {
  if (ctx.y - height >= MARGIN) return;
  ctx.page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
}

function drawLine(ctx: Ctx, y: number) {
  ctx.page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.6,
    color: LINE,
  });
}

function drawText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> },
) {
  const size = options?.size ?? 9;
  const font = options?.bold ? ctx.bold : ctx.font;
  const safeText = sanitizePdfText(text);
  ctx.page.drawText(safeText, {
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
  const size = options?.size ?? 9;
  const font = options?.bold ? ctx.bold : ctx.font;
  const safeText = sanitizePdfText(text);
  const width = font.widthOfTextAtSize(safeText, size);
  drawText(ctx, safeText, rightX - width, y, options);
}

function drawWrapped(
  ctx: Ctx,
  text: string,
  x: number,
  maxWidth: number,
  options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> },
): number {
  const size = options?.size ?? 9;
  const font = options?.bold ? ctx.bold : ctx.font;
  const safe = sanitizePdfText(text);
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  const startY = ctx.y;
  for (const line of lines) {
    drawText(ctx, line, x, ctx.y, { size, bold: options?.bold, color: options?.color });
    ctx.y -= size + 3;
  }
  return startY - ctx.y;
}

function drawCentered(
  ctx: Ctx,
  text: string,
  centerX: number,
  y: number,
  options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> },
) {
  const size = options?.size ?? 9;
  const font = options?.bold ? ctx.bold : ctx.font;
  const safeText = sanitizePdfText(text);
  const width = font.widthOfTextAtSize(safeText, size);
  drawText(ctx, safeText, centerX - width / 2, y, options);
}

function wrapTextLines(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number,
): string[] {
  const safe = sanitizePdfText(text);
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function drawPayslipHeader(
  ctx: Ctx,
  payslip: PayslipDetail,
  logoBytes: Uint8Array | null,
): Promise<number> {
  const headerTop = PAGE_HEIGHT - MARGIN;
  const logoSize = 52;
  const logoGap = 12;
  const rightColW = 132;
  const payslipDividerX = PAGE_WIDTH - MARGIN - rightColW - 10;
  const brandLeftX = MARGIN;
  const textX = logoBytes ? brandLeftX + logoSize + logoGap : brandLeftX;
  const brandRightX = payslipDividerX - 10;
  const textMaxW = brandRightX - textX;
  const logoBottom = headerTop - logoSize;
  let hasLogo = false;

  if (logoBytes) {
    try {
      const image = payslip.organization.logoUrl?.toLowerCase().includes(".png")
        ? await ctx.pdf.embedPng(logoBytes)
        : await ctx.pdf.embedJpg(logoBytes);
      ctx.page.drawImage(image, {
        x: brandLeftX,
        y: logoBottom,
        width: logoSize,
        height: logoSize,
      });
      hasLogo = true;
    } catch {
      // Logo is optional — continue with text-only header.
    }
  }

  const nameBaseline = headerTop - 15;
  drawText(ctx, payslip.organization.name, textX, nameBaseline, { size: 15, bold: true });

  let addrY = nameBaseline - 14;
  const addressLines = formatPayslipDisplayAddress(payslip.organization.addressLines);
  for (const line of addressLines) {
    const wrapped = wrapTextLines(ctx.font, line, 7.5, textMaxW);
    for (const wrappedLine of wrapped) {
      drawText(ctx, wrappedLine, textX, addrY, { size: 7.5, color: MUTED });
      addrY -= 10;
    }
  }

  const meta: string[] = [];
  if (payslip.organization.gstNumber) meta.push(`GST: ${payslip.organization.gstNumber}`);
  if (payslip.organization.cin) meta.push(`CIN: ${payslip.organization.cin}`);
  if (meta.length) {
    drawText(ctx, meta.join("  |  "), textX, addrY, { size: 7, color: MUTED });
    addrY -= 10;
  }

  const rightX = PAGE_WIDTH - MARGIN;
  drawRight(ctx, "PAYSLIP", rightX, headerTop - 10, { size: 8, color: MUTED });
  drawRight(ctx, formatPayrollMonthLabel(payslip.payrollMonth), rightX, headerTop - 30, {
    size: 17,
    bold: true,
  });
  drawRight(ctx, payslip.payslipNumber, rightX, headerTop - 48, {
    size: 8,
    color: MUTED,
  });

  const dividerBottom = Math.min(addrY, logoBottom) - 4;
  ctx.page.drawLine({
    start: { x: payslipDividerX, y: logoBottom + 2 },
    end: { x: payslipDividerX, y: dividerBottom },
    thickness: 0.6,
    color: LINE,
  });

  const headerBlockBottom = Math.min(hasLogo ? logoBottom : addrY, addrY) - 12;
  ctx.y = headerBlockBottom;
  drawLine(ctx, ctx.y);
  return ctx.y - 18;
}

function drawEmployeeDetailsCard(
  ctx: Ctx,
  employeeName: string,
  payslip: PayslipDetail,
) {
  ensureSpace(ctx, 108);
  const cardTop = ctx.y;
  const cardH = 98;
  const cardY = cardTop - cardH;
  const colW = CONTENT_WIDTH / 2;
  const pad = 14;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: cardY,
    width: CONTENT_WIDTH,
    height: cardH,
    color: rgb(1, 1, 1),
    borderColor: LINE,
    borderWidth: 0.8,
  });

  drawText(ctx, "Employee Details", MARGIN + pad, cardTop - 14, { size: 11, bold: true });
  ctx.page.drawLine({
    start: { x: MARGIN + pad, y: cardTop - 20 },
    end: { x: PAGE_WIDTH - MARGIN - pad, y: cardTop - 20 },
    thickness: 0.4,
    color: LINE,
  });

  const leftFields = [
    { label: "Employee Name", value: employeeName },
    { label: "Employee ID", value: payslip.employee.employeeCode },
    { label: "Department", value: payslip.employee.departmentName ?? "-" },
    { label: "Designation", value: payslip.employee.designationTitle ?? "-" },
  ];
  const rightFields = [
    { label: "Date of Joining", value: fmtDate(payslip.employee.dateOfJoining) },
    { label: "Bank Name", value: payslip.bankAccount?.bankName ?? "-" },
    {
      label: "Bank Account No.",
      value: payslip.bankAccount?.accountNumberMasked ?? "-",
    },
    { label: "PAN", value: payslip.employee.pan ?? "-" },
  ];

  const startY = cardTop - 40;
  const rowH = 15;
  const leftLabelX = MARGIN + pad;
  const leftValueRightX = MARGIN + colW - pad;
  const rightLabelX = MARGIN + colW + pad;
  const rightValueRightX = PAGE_WIDTH - MARGIN - pad;
  const valueMaxW = colW - pad * 2 - 90;

  const drawField = (
    label: string,
    value: string,
    labelX: number,
    valueRightX: number,
    y: number,
  ) => {
    drawText(ctx, label, labelX, y, { size: 8, color: MUTED });
    drawRight(
      ctx,
      truncateText(ctx.bold, value, 9, valueMaxW),
      valueRightX,
      y,
      { size: 9, bold: true },
    );
  };

  leftFields.forEach((field, index) => {
    drawField(field.label, field.value, leftLabelX, leftValueRightX, startY - index * rowH);
  });
  rightFields.forEach((field, index) => {
    drawField(field.label, field.value, rightLabelX, rightValueRightX, startY - index * rowH);
  });

  ctx.y = cardY - 16;
}

function drawDualEarningsDeductionsTable(
  ctx: Ctx,
  earnings: PayrollBreakdownLine[],
  deductions: PayrollBreakdownLine[],
  grossSalary: number,
  totalDeductions: number,
  money: (v: number) => string,
) {
  const halfW = CONTENT_WIDTH / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + halfW;
  const maxRows = Math.max(earnings.length, deductions.length, 1);
  const rowH = 16;
  const headerH = 18;
  const footerH = 18;
  const tableH = headerH + maxRows * rowH + footerH;
  const topY = ctx.y;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: topY - tableH,
    width: CONTENT_WIDTH,
    height: tableH,
    borderColor: LINE,
    borderWidth: 0.8,
  });

  ctx.page.drawLine({
    start: { x: rightX, y: topY },
    end: { x: rightX, y: topY - tableH },
    thickness: 0.6,
    color: LINE,
  });

  const headerY = topY - 12;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: topY - headerH,
    width: CONTENT_WIDTH,
    height: headerH,
    color: PANEL,
  });
  drawText(ctx, "EARNINGS", leftX + 10, headerY, { size: 8, bold: true, color: MUTED });
  drawRight(ctx, "AMOUNT", leftX + halfW - 10, headerY, { size: 8, bold: true, color: MUTED });
  drawText(ctx, "DEDUCTIONS", rightX + 10, headerY, { size: 8, bold: true, color: MUTED });
  drawRight(ctx, "AMOUNT", PAGE_WIDTH - MARGIN - 10, headerY, {
    size: 8,
    bold: true,
    color: MUTED,
  });

  ctx.page.drawLine({
    start: { x: MARGIN, y: topY - headerH },
    end: { x: PAGE_WIDTH - MARGIN, y: topY - headerH },
    thickness: 0.4,
    color: LINE,
    dashArray: [2, 2],
  });

  let rowY = topY - headerH;
  for (let index = 0; index < maxRows; index += 1) {
    rowY -= rowH;
    const earning = earnings[index];
    const deduction = deductions[index];

    if (earning) {
      drawText(ctx, earning.label, leftX + 10, rowY + 5, { size: 9 });
      drawRight(ctx, money(earning.amount), leftX + halfW - 10, rowY + 5, { size: 9 });
    }
    if (deduction) {
      drawText(ctx, deduction.label, rightX + 10, rowY + 5, { size: 9 });
      drawRight(ctx, money(deduction.amount), PAGE_WIDTH - MARGIN - 10, rowY + 5, {
        size: 9,
      });
    }

    if (index < maxRows - 1) {
      ctx.page.drawLine({
        start: { x: MARGIN, y: rowY },
        end: { x: PAGE_WIDTH - MARGIN, y: rowY },
        thickness: 0.4,
        color: LINE,
        dashArray: [2, 2],
      });
    }
  }

  const footerTop = topY - headerH - maxRows * rowH;
  ctx.page.drawLine({
    start: { x: MARGIN, y: footerTop },
    end: { x: PAGE_WIDTH - MARGIN, y: footerTop },
    thickness: 0.4,
    color: LINE,
    dashArray: [2, 2],
  });

  const footerY = topY - tableH + 6;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: topY - tableH,
    width: CONTENT_WIDTH,
    height: footerH,
    color: rgb(0.94, 0.95, 0.96),
  });
  drawText(ctx, "Gross Earnings", leftX + 10, footerY, { size: 9, bold: true });
  drawRight(ctx, money(grossSalary), leftX + halfW - 10, footerY, { size: 9, bold: true });
  drawText(ctx, "Total Deductions", rightX + 10, footerY, { size: 9, bold: true });
  drawRight(ctx, money(totalDeductions), PAGE_WIDTH - MARGIN - 10, footerY, {
    size: 9,
    bold: true,
  });

  ctx.y = topY - tableH - 14;
}

function drawSalarySummaryPanel(
  ctx: Ctx,
  payslip: PayslipDetail,
  money: (value: number) => string,
) {
  ensureSpace(ctx, 108);
  const panelTop = ctx.y;
  const pad = 16;
  const titleH = 24;
  const cardsH = 56;
  const panelH = pad + titleH + cardsH + pad;
  const panelY = panelTop - panelH;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: panelY,
    width: CONTENT_WIDTH,
    height: panelH,
    color: PANEL,
    borderColor: LINE,
    borderWidth: 0.8,
  });

  const titleY = panelTop - pad - 8;
  drawText(ctx, "SALARY SUMMARY", MARGIN + pad, titleY, {
    size: 8,
    bold: true,
    color: MUTED,
  });
  ctx.page.drawLine({
    start: { x: MARGIN + pad, y: titleY - 6 },
    end: { x: PAGE_WIDTH - MARGIN - pad, y: titleY - 6 },
    thickness: 0.5,
    color: LINE,
  });

  const cardsTop = titleY - 18;
  const cardH = 48;
  const cardY = cardsTop - cardH;
  const summaryCount = 4;
  const gap = 10;
  const innerW = CONTENT_WIDTH - pad * 2;
  const cardW = (innerW - (summaryCount - 1) * gap) / summaryCount;
  const labels = ["Gross Salary", "Total Earnings", "Total Deductions", "Net Salary"];
  const values = [
    payslip.grossSalary,
    payslip.totalEarnings,
    payslip.totalDeductions,
    payslip.netSalary,
  ];

  labels.forEach((label, index) => {
    const x = MARGIN + pad + index * (cardW + gap);
    const isNet = index === summaryCount - 1;
    ctx.page.drawRectangle({
      x,
      y: cardY,
      width: cardW,
      height: cardH,
      borderColor: isNet ? rgb(0.82, 0.76, 0.95) : LINE,
      borderWidth: 0.7,
      color: rgb(1, 1, 1),
    });
    drawText(ctx, label.toUpperCase(), x + 10, cardsTop - 11, {
      size: 7,
      color: MUTED,
    });
    drawText(ctx, money(values[index] ?? 0), x + 10, cardsTop - 30, {
      size: isNet ? 11 : 10,
      bold: true,
      color: isNet ? ACCENT : TEXT,
    });
  });

  ctx.y = panelY - 16;
}

function drawNetPayPanel(ctx: Ctx, payslip: PayslipDetail, money: (value: number) => string) {
  ensureSpace(ctx, 118);
  const panelTop = ctx.y;
  const panelH = 108;
  const panelY = panelTop - panelH;
  const midX = MARGIN + CONTENT_WIDTH / 2;
  const pad = 16;
  const halfW = CONTENT_WIDTH / 2 - pad * 2;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: panelY,
    width: CONTENT_WIDTH,
    height: panelH,
    color: PANEL,
    borderColor: LINE,
    borderWidth: 0.8,
  });
  ctx.page.drawLine({
    start: { x: midX, y: panelY + 12 },
    end: { x: midX, y: panelTop - 12 },
    thickness: 0.6,
    color: LINE,
  });

  const leftX = MARGIN + pad;
  const leftTextX = leftX;

  drawText(ctx, "NET PAY", leftTextX, panelTop - 22, { size: 7, color: MUTED });
  drawText(ctx, money(payslip.netSalary), leftTextX, panelTop - 40, { size: 18, bold: true });

  const wordsY = panelTop - 54;
  ctx.y = wordsY;
  drawWrapped(ctx, amountToIndianWords(payslip.netSalary), leftTextX, halfW, {
    size: 7.5,
    color: MUTED,
  });
  drawText(ctx, `Credited on ${fmtDate(payslip.salaryCreditDate)}`, leftTextX, ctx.y - 2, {
    size: 7.5,
    color: MUTED,
  });

  const rightX = midX + pad;
  const rightW = halfW;
  const subColW = (rightW - 12) / 2;

  drawText(ctx, "PAYMENT MODE", rightX, panelTop - 22, { size: 7, color: MUTED });
  const paymentLine = [
    payslip.paymentMode,
    payslip.bankAccount?.bankName ?? "-",
    payslip.bankAccount?.accountNumberMasked ?? "-",
  ].join(" - ");
  ctx.y = panelTop - 36;
  drawWrapped(ctx, paymentLine, rightX, rightW, { size: 8.5, bold: true });

  const gridY = panelY + 22;
  drawText(ctx, "SALARY CREDIT DATE", rightX, gridY + 28, { size: 7, color: MUTED });
  drawText(ctx, fmtDate(payslip.salaryCreditDate), rightX, gridY + 16, {
    size: 9,
    bold: true,
  });

  const refX = rightX + subColW + 12;
  drawText(ctx, "TRANSACTION REFERENCE", refX, gridY + 28, { size: 7, color: MUTED });
  drawText(
    ctx,
    truncateText(ctx.bold, payslip.transactionReference ?? "Salary Payroll", 9, subColW),
    refX,
    gridY + 16,
    { size: 9, bold: true },
  );

  ctx.y = panelY - 20;
}

function drawFooter(ctx: Ctx, payslip: PayslipDetail, qrImage?: Awaited<ReturnType<PDFDocument["embedPng"]>>) {
  const footerTop = MARGIN + 78;
  drawLine(ctx, footerTop);

  const textCenterX = MARGIN + (CONTENT_WIDTH - (qrImage ? 58 : 0)) / 2;
  drawCentered(ctx, payslip.organization.footerMessage, textCenterX, footerTop - 18, {
    size: 7.5,
    color: MUTED,
  });
  drawCentered(
    ctx,
    `Generated by ${PAYSLIP_ENGINE_NAME} - v${payslip.payslipVersion} - ${format(new Date(), "dd MMM yyyy, HH:mm")}`,
    textCenterX,
    footerTop - 32,
    { size: 7, color: MUTED },
  );

  if (qrImage) {
    ctx.page.drawImage(qrImage, {
      x: PAGE_WIDTH - MARGIN - 52,
      y: MARGIN + 18,
      width: 52,
      height: 52,
    });
  }
}

function drawAmountTable(
  ctx: Ctx,
  title: string,
  lines: PayrollBreakdownLine[],
  money: (v: number) => string,
  width: number,
  x: number,
) {
  const startY = ctx.y;
  drawText(ctx, title.toUpperCase(), x, startY, { size: 8, bold: true, color: MUTED });
  let y = startY - 16;
  ctx.page.drawRectangle({
    x,
    y: y - 12,
    width,
    height: 14,
    color: PANEL,
  });
  drawText(ctx, "Component", x + 6, y - 9, { size: 7, bold: true, color: MUTED });
  drawRight(ctx, "Amount", x + width - 6, y - 9, { size: 7, bold: true, color: MUTED });
  y -= 18;

  for (const line of lines) {
    drawText(ctx, line.label, x + 6, y - 9, { size: 8 });
    drawRight(ctx, money(line.amount), x + width - 6, y - 9, { size: 8 });
    y -= 14;
  }

  if (lines.length === 0) {
    drawText(ctx, "No items", x + 6, y - 9, { size: 8, color: MUTED });
    y -= 14;
  }

  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  ctx.page.drawRectangle({
    x,
    y: y - 10,
    width,
    height: 14,
    color: PANEL,
  });
  drawText(ctx, "Total", x + 6, y - 7, { size: 8, bold: true });
  drawRight(ctx, money(total), x + width - 6, y - 7, { size: 8, bold: true });
  return y - 20;
}

export async function generatePayslipPdfBytes(payslip: PayslipDetail): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const ctx: Ctx = { pdf, page, font, bold, y: PAGE_HEIGHT - MARGIN };

  const money = (value: number) => pdfMoney(value, payslip.currencyCode);
  const employeeName = `${payslip.employee.firstName} ${payslip.employee.lastName}`.trim();
  const earnings =
    payslip.breakdown.earnings.length > 0
      ? payslip.breakdown.earnings
      : [
          {
            code: "gross",
            label: "Gross Earnings",
            amount: payslip.grossSalary,
            type: "earning" as const,
          },
        ];

  const logoBytes = await loadLogoBytes(payslip.organization.logoUrl);
  ctx.y = await drawPayslipHeader(ctx, payslip, logoBytes);

  drawEmployeeDetailsCard(ctx, employeeName, payslip);
  drawSalarySummaryPanel(ctx, payslip, money);

  drawDualEarningsDeductionsTable(
    ctx,
    earnings,
    payslip.breakdown.deductions,
    payslip.grossSalary,
    payslip.totalDeductions,
    money,
  );

  drawNetPayPanel(ctx, payslip, money);

  let qrImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | undefined;
  try {
    const qrPng = await QRCode.toBuffer(payslip.payslipNumber, {
      margin: 1,
      width: 128,
      type: "png",
    });
    qrImage = await pdf.embedPng(qrPng);
  } catch {
    // QR is optional
  }

  drawFooter(ctx, payslip, qrImage);

  return pdf.save();
}
