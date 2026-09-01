import { format, parseISO, lastDayOfMonth } from "date-fns";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { amountToIndianWords } from "@/lib/payroll/services/amount-in-words";
import { loadLogoBytesCached } from "@/lib/payroll/services/payslip-logo-cache";
import {
  getPayslipDeductionLines,
  getPayslipEarningsLines,
} from "@/lib/payroll/services/payroll-utils";
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

  const earnings = getPayslipEarningsLines({
    earnings: payslip.breakdown?.earnings,
    basicSalary: payslip.basicSalary,
    totalAllowances: payslip.totalAllowances,
    grossSalary: payslip.grossSalary,
  });
  const deductions = getPayslipDeductionLines(payslip.breakdown?.deductions);

  const totalEarnings =
    earnings.reduce((sum, item) => sum + Number(item.amount || 0), 0) || payslip.grossSalary;
  const totalDeductions =
    deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0) || payslip.totalDeductions;
  const netPay = payslip.netSalary || totalEarnings - totalDeductions;

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
  const rowH = 18;

  // Grid coordinates for 4-column section (equal label/value pairs)
  const col1X = MARGIN;
  const col1W = CONTENT_WIDTH * 0.22;
  const col2X = col1X + col1W;
  const col2W = CONTENT_WIDTH * 0.28;
  const col3X = col2X + col2W;
  const col3W = CONTENT_WIDTH * 0.22;
  const col4X = col3X + col3W;

  const infoRows = [
    [
      { label: "EMPLOYEE ID", value: payslip.employee.employeeCode, boldVal: false },
      { label: "PAYMENT MODE", value: (payslip.paymentMode || "BANK").toUpperCase(), boldVal: false },
    ],
    [
      { label: "EMPLOYEE NAME", value: employeeName, boldVal: true },
      { label: "BANK NAME", value: fmt(payslip.bankAccount?.bankName), boldVal: false },
    ],
    [
      { label: "JOINING DT", value: fmtDateUpper(payslip.employee.dateOfJoining), boldVal: false },
      { label: "BANK A/C NO", value: fmt(payslip.bankAccount?.accountNumberMasked), boldVal: false },
    ],
    [
      { label: "DESIGNATION", value: fmt(payslip.employee.designationTitle).toUpperCase(), boldVal: true },
      { label: "WORK DAYS", value: Number(workDays).toFixed(2), boldVal: false },
    ],
    [
      {
        label: "LOCATION",
        value: fmt(
          payslip.employee.branchName || payslip.employee.departmentName || "CHENNAI",
        ).toUpperCase(),
        boldVal: false,
      },
      { label: "PAID DAYS", value: Number(paidDays).toFixed(2), boldVal: false },
    ],
    [
      { label: "PAN NO", value: fmt(payslip.employee.pan), boldVal: false },
      { label: "LOP DAYS", value: Number(lopDays).toFixed(2), boldVal: false },
    ],
  ];

  for (const row of infoRows) {
    const yBot = currentY - rowH;
    ctx.page.drawLine({
      start: { x: MARGIN, y: yBot },
      end: { x: MARGIN + CONTENT_WIDTH, y: yBot },
      thickness: 0.8,
      color: BORDER_COLOR,
    });
    ctx.page.drawLine({
      start: { x: col2X, y: currentY },
      end: { x: col2X, y: yBot },
      thickness: 0.8,
      color: BORDER_COLOR,
    });
    ctx.page.drawLine({
      start: { x: col3X, y: currentY },
      end: { x: col3X, y: yBot },
      thickness: 0.8,
      color: BORDER_COLOR,
    });
    ctx.page.drawLine({
      start: { x: col4X, y: currentY },
      end: { x: col4X, y: yBot },
      thickness: 0.8,
      color: BORDER_COLOR,
    });

    const textY = yBot + 5;
    drawText(ctx, row[0].label, col1X + 4, textY, { size: 7.5, bold: true });
    drawText(ctx, row[0].value, col2X + 4, textY, { size: 7.5, bold: row[0].boldVal });
    drawText(ctx, row[1].label, col3X + 4, textY, { size: 7.5, bold: true });
    drawText(ctx, row[1].value, col4X + 4, textY, { size: 7.5, bold: row[1].boldVal });

    currentY = yBot;
  }

  // Earnings / Deductions (4 equal columns)
  const sc1X = MARGIN;
  const sc1W = CONTENT_WIDTH * 0.3;
  const sc2X = sc1X + sc1W;
  const sc2W = CONTENT_WIDTH * 0.2;
  const sc3X = sc2X + sc2W;
  const sc3W = CONTENT_WIDTH * 0.3;
  const sc4X = sc3X + sc3W;

  const compHeaderY = currentY - rowH;
  ctx.page.drawLine({
    start: { x: MARGIN, y: compHeaderY },
    end: { x: MARGIN + CONTENT_WIDTH, y: compHeaderY },
    thickness: 0.8,
    color: BORDER_COLOR,
  });
  ctx.page.drawLine({
    start: { x: sc2X, y: currentY },
    end: { x: sc2X, y: compHeaderY },
    thickness: 0.8,
    color: BORDER_COLOR,
  });
  ctx.page.drawLine({
    start: { x: sc3X, y: currentY },
    end: { x: sc3X, y: compHeaderY },
    thickness: 0.8,
    color: BORDER_COLOR,
  });
  ctx.page.drawLine({
    start: { x: sc4X, y: currentY },
    end: { x: sc4X, y: compHeaderY },
    thickness: 0.8,
    color: BORDER_COLOR,
  });

  drawText(ctx, "EARNINGS", sc1X + 4, compHeaderY + 5, { size: 7.5, bold: true });
  drawRight(ctx, "AMOUNT", sc3X - 4, compHeaderY + 5, { size: 7.5, bold: true });
  drawText(ctx, "DEDUCTIONS", sc3X + 4, compHeaderY + 5, { size: 7.5, bold: true });
  drawRight(ctx, "AMOUNT", MARGIN + CONTENT_WIDTH - 4, compHeaderY + 5, { size: 7.5, bold: true });

  currentY = compHeaderY;

  const maxRows = Math.max(earnings.length, deductions.length, 1);

  for (let i = 0; i < maxRows; i++) {
    const yBot = currentY - rowH;
    ctx.page.drawLine({
      start: { x: MARGIN, y: yBot },
      end: { x: MARGIN + CONTENT_WIDTH, y: yBot },
      thickness: 0.4,
      color: BORDER_COLOR,
    });
    ctx.page.drawLine({
      start: { x: sc2X, y: currentY },
      end: { x: sc2X, y: yBot },
      thickness: 0.8,
      color: BORDER_COLOR,
    });
    ctx.page.drawLine({
      start: { x: sc3X, y: currentY },
      end: { x: sc3X, y: yBot },
      thickness: 0.8,
      color: BORDER_COLOR,
    });
    ctx.page.drawLine({
      start: { x: sc4X, y: currentY },
      end: { x: sc4X, y: yBot },
      thickness: 0.8,
      color: BORDER_COLOR,
    });

    const earning = earnings[i];
    const deduction = deductions[i];
    const textY = yBot + 5;

    if (earning) {
      drawText(ctx, earning.label, sc1X + 4, textY, { size: 7.5 });
      drawRight(ctx, formatAmount2(earning.amount), sc3X - 4, textY, { size: 7.5 });
    }

    if (deduction) {
      drawText(ctx, deduction.label, sc3X + 4, textY, { size: 7.5 });
      drawRight(ctx, formatAmount2(deduction.amount), MARGIN + CONTENT_WIDTH - 4, textY, {
        size: 7.5,
      });
    }

    currentY = yBot;
  }

  // Total Earnings / Total Deductions
  const totalRowY = currentY - rowH;
  ctx.page.drawLine({
    start: { x: MARGIN, y: totalRowY },
    end: { x: MARGIN + CONTENT_WIDTH, y: totalRowY },
    thickness: 1.0,
    color: BORDER_COLOR,
  });
  ctx.page.drawLine({
    start: { x: sc2X, y: currentY },
    end: { x: sc2X, y: totalRowY },
    thickness: 0.8,
    color: BORDER_COLOR,
  });
  ctx.page.drawLine({
    start: { x: sc3X, y: currentY },
    end: { x: sc3X, y: totalRowY },
    thickness: 0.8,
    color: BORDER_COLOR,
  });
  ctx.page.drawLine({
    start: { x: sc4X, y: currentY },
    end: { x: sc4X, y: totalRowY },
    thickness: 0.8,
    color: BORDER_COLOR,
  });

  drawText(ctx, "Total Earnings", sc1X + 4, totalRowY + 5, { size: 8, bold: true });
  drawRight(ctx, formatAmount2(totalEarnings), sc3X - 4, totalRowY + 5, { size: 8, bold: true });
  drawText(ctx, "Total Deductions", sc3X + 4, totalRowY + 5, { size: 8, bold: true });
  drawRight(ctx, formatAmount2(totalDeductions), MARGIN + CONTENT_WIDTH - 4, totalRowY + 5, {
    size: 8,
    bold: true,
  });

  currentY = totalRowY;

  // Net Pay Row
  const netPayY = currentY - rowH;
  ctx.page.drawLine({
    start: { x: MARGIN, y: netPayY },
    end: { x: MARGIN + CONTENT_WIDTH, y: netPayY },
    thickness: 0.8,
    color: BORDER_COLOR,
  });
  ctx.page.drawLine({
    start: { x: sc3X, y: currentY },
    end: { x: sc3X, y: netPayY },
    thickness: 0.8,
    color: BORDER_COLOR,
  });
  ctx.page.drawLine({
    start: { x: sc4X, y: currentY },
    end: { x: sc4X, y: netPayY },
    thickness: 0.8,
    color: BORDER_COLOR,
  });

  drawRight(ctx, "NET PAY", sc4X - 4, netPayY + 5, { size: 8.5, bold: true });
  drawRight(ctx, formatAmountIndian(netPay), MARGIN + CONTENT_WIDTH - 4, netPayY + 5, {
    size: 8.5,
    bold: true,
  });

  currentY = netPayY;

  // Net Pay in Words Row
  const inWordsRowH = 22;
  const inWordsY = currentY - inWordsRowH;
  ctx.page.drawLine({
    start: { x: MARGIN, y: inWordsY },
    end: { x: MARGIN + CONTENT_WIDTH, y: inWordsY },
    thickness: 1.0,
    color: BORDER_COLOR,
  });

  drawText(ctx, `Net Pay: ${amountToIndianWords(netPay)}`, MARGIN + 4, inWordsY + 7, {
    size: 8.5,
    bold: true,
  });

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
