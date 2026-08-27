import { format, parseISO, lastDayOfMonth } from "date-fns";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { amountToIndianWords } from "@/lib/payroll/services/amount-in-words";
import { loadLogoBytesCached } from "@/lib/payroll/services/payslip-logo-cache";
import { toEmployeeFacingEarnings } from "@/lib/payroll/services/payroll-utils";
import type { PayslipDetail } from "@/types/payroll";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TEXT = rgb(0, 0, 0);
const BORDER_COLOR = rgb(0, 0, 0);

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

function fmt(value: string | null | undefined, fallback = "-"): string {
  return value?.trim() ? sanitizePdfText(value.trim()) : fallback;
}

function fmtDateUpper(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    const d = parseISO(value.length === 10 ? value : value.slice(0, 10));
    return format(d, "dd-MMM-yyyy").toUpperCase();
  } catch {
    return "-";
  }
}

function formatMonthYearHeader(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "-";
    return format(d, "MMM - yyyy").toUpperCase();
  } catch {
    return "-";
  }
}

function formatAmount2(value: number | undefined | null): string {
  const num = Number(value) || 0;
  return num.toFixed(2);
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
  const size = options?.size ?? 8.5;
  const font = options?.bold ? ctx.bold : ctx.font;
  const safeText = sanitizePdfText(text);
  const width = font.widthOfTextAtSize(safeText, size);
  drawText(ctx, safeText, rightX - width, y, options);
}

function drawCentered(
  ctx: Ctx,
  text: string,
  centerX: number,
  y: number,
  options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> },
) {
  const size = options?.size ?? 8.5;
  const font = options?.bold ? ctx.bold : ctx.font;
  const safeText = sanitizePdfText(text);
  const width = font.widthOfTextAtSize(safeText, size);
  drawText(ctx, safeText, centerX - width / 2, y, options);
}

export async function generatePayslipPdfBytes(payslip: PayslipDetail): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const ctx: Ctx = { pdf, page, font, bold, y: PAGE_HEIGHT - MARGIN };

  const employeeName = `${payslip.employee.firstName} ${payslip.employee.lastName}`.trim().toUpperCase();
  const organizationName = payslip.organization.name.toUpperCase();
  const monthHeader = formatMonthYearHeader(payslip.payrollMonth);

  // Compute work days & paid days
  let totalDaysInMonth = 30;
  try {
    const monthDate = new Date(payslip.payrollMonth);
    totalDaysInMonth = lastDayOfMonth(monthDate).getDate();
  } catch {
    totalDaysInMonth = 30;
  }

  const attendance = payslip.breakdown?.attendance;
  const workDays = attendance?.workingDays && attendance.workingDays > 0 ? attendance.workingDays : totalDaysInMonth;
  const lopDays = attendance?.lopDays ?? attendance?.leaveLopDays ?? 0;
  const paidDays = attendance?.presentDays && attendance.presentDays > 0 ? attendance.presentDays : Math.max(0, workDays - lopDays);

  // Standard Indian earnings
  const rawEarnings = payslip.breakdown?.earnings?.length > 0
    ? toEmployeeFacingEarnings(payslip.breakdown.earnings)
    : [
        {
          code: "basic",
          label: "Basic",
          amount: payslip.basicSalary > 0 ? payslip.basicSalary : Math.round(payslip.grossSalary * 0.5),
          type: "earning" as const,
        },
        {
          code: "hra",
          label: "HRA",
          amount: payslip.totalAllowances > 0 ? Math.round(payslip.totalAllowances * 0.4) : Math.round(payslip.grossSalary * 0.2),
          type: "earning" as const,
        },
        {
          code: "special_allowance",
          label: "Special Allowance",
          amount: Math.max(0, payslip.grossSalary - (payslip.basicSalary > 0 ? payslip.basicSalary : Math.round(payslip.grossSalary * 0.5)) - (payslip.totalAllowances > 0 ? Math.round(payslip.totalAllowances * 0.4) : Math.round(payslip.grossSalary * 0.2))),
          type: "earning" as const,
        },
      ];

  const earnings = rawEarnings.filter((item) => item.amount > 0);
  const deductions = (payslip.breakdown?.deductions ?? []).filter((line) => Number(line.amount) > 0);

  const totalEarnings = earnings.reduce((sum, item) => sum + Number(item.amount || 0), 0) || payslip.grossSalary;
  const totalDeductions = deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0) || payslip.totalDeductions;
  const netPay = payslip.netSalary || (totalEarnings - totalDeductions);

  // Leave balances
  const sickLeaveUsed = "0.00";
  const casualLeaveUsed = "0.00";
  const sickLeaveBal = "1.00";
  const casualLeaveBal = "3.00";

  // Header Drawing
  const logoBytes = await loadLogoBytesCached(payslip.organization.logoUrl);
  const headerTop = PAGE_HEIGHT - MARGIN;

  if (logoBytes) {
    try {
      let image: Awaited<ReturnType<PDFDocument["embedPng"]>>;
      try {
        image = await ctx.pdf.embedPng(logoBytes);
      } catch {
        image = await ctx.pdf.embedJpg(logoBytes);
      }

      const maxW = 72;
      const maxH = 46;
      let drawW = maxW;
      let drawH = maxH;
      if (image.width && image.height) {
        const scale = Math.min(maxW / image.width, maxH / image.height);
        drawW = image.width * scale;
        drawH = image.height * scale;
      }

      ctx.page.drawImage(image, {
        x: MARGIN,
        y: headerTop - 50 + (maxH - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    } catch {
      // Optional logo fallback
    }
  }

  // Centered Company Name and Pay slip title
  drawCentered(ctx, organizationName, PAGE_WIDTH / 2, headerTop - 16, { size: 13, bold: true });
  drawCentered(ctx, `PAY SLIP FOR THE MONTH OF ${monthHeader}`, PAGE_WIDTH / 2, headerTop - 32, { size: 10, bold: true });

  // Start Box Table
  const boxTop = headerTop - 56;
  let currentY = boxTop;
  const rowH = 17;

  // Grid coordinates for 4-column section
  const col1X = MARGIN;
  const col1W = CONTENT_WIDTH * 0.18;
  const col2X = col1X + col1W;
  const col2W = CONTENT_WIDTH * 0.32;
  const col3X = col2X + col2W;
  const col3W = CONTENT_WIDTH * 0.20;
  const col4X = col3X + col3W;

  const infoRows = [
    [
      { label: "EMP CODE", value: payslip.employee.employeeCode, boldVal: false },
      { label: "PAYMENT MODE", value: (payslip.paymentMode || "BANK").toUpperCase(), boldVal: false },
    ],
    [
      { label: "EMP NAME", value: employeeName, boldVal: true },
      { label: "BANK NAME", value: fmt(payslip.bankAccount?.bankName), boldVal: false },
    ],
    [
      { label: "JOINING DT", value: fmtDateUpper(payslip.employee.dateOfJoining), boldVal: false },
      { label: "BANK A/C NO", value: fmt(payslip.bankAccount?.accountNumberMasked), boldVal: false },
    ],
    [
      { label: "DESIGNATION", value: fmt(payslip.employee.designationTitle).toUpperCase(), boldVal: true },
      { label: "ESIC NO", value: fmt(payslip.employee.pan), boldVal: false },
    ],
    [
      { label: "LOCATION", value: fmt(payslip.employee.branchName || payslip.employee.departmentName || "CHENNAI").toUpperCase(), boldVal: false },
      { label: "WORK DAYS", value: Number(workDays).toFixed(2), boldVal: false },
    ],
    [
      { label: "UAN NO", value: fmt(payslip.employee.uan), boldVal: false },
      { label: "PAID DAYS", value: Number(paidDays).toFixed(2), boldVal: false },
    ],
    [
      { label: "PAN NO", value: fmt(payslip.employee.pan), boldVal: false },
      { label: "LOP DAYS", value: Number(lopDays).toFixed(2), boldVal: false },
    ],
  ];

  // Draw 7 info rows
  for (const row of infoRows) {
    const yBot = currentY - rowH;
    // Row horizontal bottom line
    ctx.page.drawLine({ start: { x: MARGIN, y: yBot }, end: { x: MARGIN + CONTENT_WIDTH, y: yBot }, thickness: 0.8, color: BORDER_COLOR });

    // Vertical column dividers
    ctx.page.drawLine({ start: { x: col2X, y: currentY }, end: { x: col2X, y: yBot }, thickness: 0.8, color: BORDER_COLOR });
    ctx.page.drawLine({ start: { x: col3X, y: currentY }, end: { x: col3X, y: yBot }, thickness: 0.8, color: BORDER_COLOR });
    ctx.page.drawLine({ start: { x: col4X, y: currentY }, end: { x: col4X, y: yBot }, thickness: 0.8, color: BORDER_COLOR });

    // Texts
    const textY = yBot + 5;
    drawText(ctx, row[0].label, col1X + 4, textY, { size: 7.5, bold: true });
    drawText(ctx, row[0].value, col2X + 4, textY, { size: 7.5, bold: row[0].boldVal });
    drawText(ctx, row[1].label, col3X + 4, textY, { size: 7.5, bold: true });
    drawText(ctx, row[1].value, col4X + 4, textY, { size: 7.5, bold: row[1].boldVal });

    currentY = yBot;
  }

  // Section 2: Leave Days Header
  const leaveHeaderY = currentY - rowH;
  ctx.page.drawLine({ start: { x: MARGIN, y: leaveHeaderY }, end: { x: MARGIN + CONTENT_WIDTH, y: leaveHeaderY }, thickness: 0.8, color: BORDER_COLOR });
  drawCentered(ctx, "NO. OF AVAILABLE LEAVE DAYS:", PAGE_WIDTH / 2, leaveHeaderY + 5, { size: 8, bold: true });
  currentY = leaveHeaderY;

  const leaveRows = [
    [
      { label: "SL", value: sickLeaveUsed },
      { label: "CL", value: casualLeaveUsed },
    ],
    [
      { label: "BAL. SL", value: sickLeaveBal },
      { label: "BAL. CL", value: casualLeaveBal },
    ],
  ];

  for (const row of leaveRows) {
    const yBot = currentY - rowH;
    ctx.page.drawLine({ start: { x: MARGIN, y: yBot }, end: { x: MARGIN + CONTENT_WIDTH, y: yBot }, thickness: 0.8, color: BORDER_COLOR });
    ctx.page.drawLine({ start: { x: col2X, y: currentY }, end: { x: col2X, y: yBot }, thickness: 0.8, color: BORDER_COLOR });
    ctx.page.drawLine({ start: { x: col3X, y: currentY }, end: { x: col3X, y: yBot }, thickness: 0.8, color: BORDER_COLOR });
    ctx.page.drawLine({ start: { x: col4X, y: currentY }, end: { x: col4X, y: yBot }, thickness: 0.8, color: BORDER_COLOR });

    const textY = yBot + 5;
    drawText(ctx, row[0].label, col1X + 4, textY, { size: 7.5, bold: true });
    drawText(ctx, row[0].value, col2X + 4, textY, { size: 7.5, bold: false });
    drawText(ctx, row[1].label, col3X + 4, textY, { size: 7.5, bold: true });
    drawText(ctx, row[1].value, col4X + 4, textY, { size: 7.5, bold: false });

    currentY = yBot;
  }

  // Section 3: Salary Components (5 Columns)
  const sc1X = MARGIN;
  const sc1W = CONTENT_WIDTH * 0.26;
  const sc2X = sc1X + sc1W;
  const sc2W = CONTENT_WIDTH * 0.14;
  const sc3X = sc2X + sc2W;
  const sc3W = CONTENT_WIDTH * 0.14;
  const sc4X = sc3X + sc3W;
  const sc4W = CONTENT_WIDTH * 0.26;
  const sc5X = sc4X + sc4W;

  // Components Header
  const compHeaderY = currentY - rowH;
  ctx.page.drawLine({ start: { x: MARGIN, y: compHeaderY }, end: { x: MARGIN + CONTENT_WIDTH, y: compHeaderY }, thickness: 0.8, color: BORDER_COLOR });
  ctx.page.drawLine({ start: { x: sc2X, y: currentY }, end: { x: sc2X, y: compHeaderY }, thickness: 0.8, color: BORDER_COLOR });
  ctx.page.drawLine({ start: { x: sc3X, y: currentY }, end: { x: sc3X, y: compHeaderY }, thickness: 0.8, color: BORDER_COLOR });
  ctx.page.drawLine({ start: { x: sc4X, y: currentY }, end: { x: sc4X, y: compHeaderY }, thickness: 0.8, color: BORDER_COLOR });
  ctx.page.drawLine({ start: { x: sc5X, y: currentY }, end: { x: sc5X, y: compHeaderY }, thickness: 0.8, color: BORDER_COLOR });

  drawText(ctx, "COMPONENTS", sc1X + 4, compHeaderY + 5, { size: 7.5, bold: true });
  drawRight(ctx, "FIXED SALARY", sc3X - 4, compHeaderY + 5, { size: 7.5, bold: true });
  drawRight(ctx, "EARNED SALARY", sc4X - 4, compHeaderY + 5, { size: 7.5, bold: true });
  drawText(ctx, "COMPONENTS", sc4X + 4, compHeaderY + 5, { size: 7.5, bold: true });
  drawRight(ctx, "SALARY", MARGIN + CONTENT_WIDTH - 4, compHeaderY + 5, { size: 7.5, bold: true });

  currentY = compHeaderY;

  const maxRows = Math.max(earnings.length, deductions.length, 5);

  for (let i = 0; i < maxRows; i++) {
    const yBot = currentY - rowH;
    ctx.page.drawLine({ start: { x: MARGIN, y: yBot }, end: { x: MARGIN + CONTENT_WIDTH, y: yBot }, thickness: 0.4, color: BORDER_COLOR });
    ctx.page.drawLine({ start: { x: sc2X, y: currentY }, end: { x: sc2X, y: yBot }, thickness: 0.8, color: BORDER_COLOR });
    ctx.page.drawLine({ start: { x: sc3X, y: currentY }, end: { x: sc3X, y: yBot }, thickness: 0.8, color: BORDER_COLOR });
    ctx.page.drawLine({ start: { x: sc4X, y: currentY }, end: { x: sc4X, y: yBot }, thickness: 0.8, color: BORDER_COLOR });
    ctx.page.drawLine({ start: { x: sc5X, y: currentY }, end: { x: sc5X, y: yBot }, thickness: 0.8, color: BORDER_COLOR });

    const earning = earnings[i];
    const deduction = deductions[i];
    const textY = yBot + 5;

    if (earning) {
      drawText(ctx, earning.label, sc1X + 4, textY, { size: 7.5 });
      drawRight(ctx, formatAmount2(earning.amount), sc3X - 4, textY, { size: 7.5 });
      drawRight(ctx, formatAmount2(earning.amount), sc4X - 4, textY, { size: 7.5 });
    }

    if (deduction) {
      drawText(ctx, deduction.label, sc4X + 4, textY, { size: 7.5 });
      drawRight(ctx, formatAmount2(deduction.amount), MARGIN + CONTENT_WIDTH - 4, textY, { size: 7.5 });
    }

    currentY = yBot;
  }

  // Amount Total Row
  const totalRowY = currentY - rowH;
  ctx.page.drawLine({ start: { x: MARGIN, y: totalRowY }, end: { x: MARGIN + CONTENT_WIDTH, y: totalRowY }, thickness: 1.0, color: BORDER_COLOR });
  ctx.page.drawLine({ start: { x: sc2X, y: currentY }, end: { x: sc2X, y: totalRowY }, thickness: 0.8, color: BORDER_COLOR });
  ctx.page.drawLine({ start: { x: sc3X, y: currentY }, end: { x: sc3X, y: totalRowY }, thickness: 0.8, color: BORDER_COLOR });
  ctx.page.drawLine({ start: { x: sc4X, y: currentY }, end: { x: sc4X, y: totalRowY }, thickness: 0.8, color: BORDER_COLOR });
  ctx.page.drawLine({ start: { x: sc5X, y: currentY }, end: { x: sc5X, y: totalRowY }, thickness: 0.8, color: BORDER_COLOR });

  drawRight(ctx, "Amount Total :", sc2X - 4, totalRowY + 5, { size: 8, bold: true });
  drawRight(ctx, formatAmount2(totalEarnings), sc3X - 4, totalRowY + 5, { size: 8, bold: true });
  drawRight(ctx, formatAmount2(totalEarnings), sc4X - 4, totalRowY + 5, { size: 8, bold: true });
  drawRight(ctx, "Amount Total :", sc5X - 4, totalRowY + 5, { size: 8, bold: true });
  drawRight(ctx, formatAmount2(totalDeductions), MARGIN + CONTENT_WIDTH - 4, totalRowY + 5, { size: 8, bold: true });

  currentY = totalRowY;

  // Net Pay Row
  const netPayY = currentY - rowH;
  ctx.page.drawLine({ start: { x: MARGIN, y: netPayY }, end: { x: MARGIN + CONTENT_WIDTH, y: netPayY }, thickness: 0.8, color: BORDER_COLOR });
  ctx.page.drawLine({ start: { x: sc4X, y: currentY }, end: { x: sc4X, y: netPayY }, thickness: 0.8, color: BORDER_COLOR });
  ctx.page.drawLine({ start: { x: sc5X, y: currentY }, end: { x: sc5X, y: netPayY }, thickness: 0.8, color: BORDER_COLOR });

  drawRight(ctx, "Net Pay :", sc5X - 4, netPayY + 5, { size: 8.5, bold: true });
  drawRight(ctx, formatAmountIndian(netPay), MARGIN + CONTENT_WIDTH - 4, netPayY + 5, { size: 8.5, bold: true });

  currentY = netPayY;

  // Net Pay in Words Row
  const inWordsRowH = 22;
  const inWordsY = currentY - inWordsRowH;
  ctx.page.drawLine({ start: { x: MARGIN, y: inWordsY }, end: { x: MARGIN + CONTENT_WIDTH, y: inWordsY }, thickness: 1.0, color: BORDER_COLOR });

  drawText(ctx, `Net Pay: ${amountToIndianWords(netPay)}`, MARGIN + 4, inWordsY + 7, { size: 8.5, bold: true });

  currentY = inWordsY;

  // Outer Box Frame
  ctx.page.drawRectangle({
    x: MARGIN,
    y: currentY,
    width: CONTENT_WIDTH,
    height: boxTop - currentY,
    borderColor: BORDER_COLOR,
    borderWidth: 1.2,
  });

  // Note footer
  drawCentered(
    ctx,
    "Note :- This is an electronically generated statement hence does not require any signature.",
    PAGE_WIDTH / 2,
    currentY - 24,
    { size: 7.5, bold: false },
  );

  return pdf.save();
}
