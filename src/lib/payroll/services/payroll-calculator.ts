import type {
  HrPayrollAdjustments,
  PayrollBreakdown,
  PayrollBreakdownLine,
  PayrollItemLifecycleStatus,
  SalaryComponents,
} from "@/types/payroll";
import type { WorkingDaysCalculation } from "@/types/payroll-settings";
import type { LeaveCalendarContext } from "@/lib/leave/services/leave-calendar-engine";
import {
  calendarDaysInYearMonth,
  monthlyGrossPerDay,
} from "@/lib/payroll/salary-structure-period";
import {
  countPayrollEligibleWorkingDays,
  resolveFullMonthPayrollWorkingDays,
  resolvePayrollApplicablePeriod,
  type PayrollApplicablePeriod,
} from "@/lib/payroll/payroll-period";
import { getMonthDateRange } from "@/lib/payroll/services/payroll-utils";
import {
  buildStandardEarningsLines,
  resolveSalaryBreakdownFromStructure,
} from "@/lib/payroll/salary-structure-breakdown";
import { roundCurrency } from "@/lib/payroll/services/payroll-utils";

export type SalaryStructureRow = {
  id: string;
  employee_id: string;
  basic_salary: number | string;
  hra_amount: number | string;
  transport_allowance: number | string;
  other_allowances: number | string;
  tax_deduction: number | string;
  other_deductions: number | string;
  gross_salary: number | string;
  net_salary: number | string;
  components: Record<string, unknown> | null;
};

export type AttendanceSummary = {
  presentDays: number;
  absentDays: number;
  halfDays: number;
  onLeaveDays: number;
  weekOffDays: number;
  holidayDays: number;
  overtimeHours: number;
  lateDays: number;
  sandwichLopDays?: number;
};

export type LeaveMonthSummary = {
  lopDays: number;
  paidLeaveDays: number;
  sandwichDates?: string[];
};

export type BonusRow = { amount: number | string; bonus_type: string };
export type ReimbursementRow = { amount: number | string; category: string };

export type PayrollCalcSettings = {
  workingDaysCalculation?: WorkingDaysCalculation;
  lossOfPayDeduction?: boolean;
  halfDayDeduction?: boolean;
  paidLeaveDeduction?: boolean;
  salaryComponents?: {
    pf?: boolean;
    esi?: boolean;
    professionalTax?: boolean;
    incomeTax?: boolean;
  };
};

export type PayrollCalculationInput = {
  month: number;
  year: number;
  salaryStructure: SalaryStructureRow | null;
  attendance: AttendanceSummary;
  leaveLopDays?: number;
  leaveSummary?: LeaveMonthSummary;
  bonuses: BonusRow[];
  reimbursements: ReimbursementRow[];
  adjustments?: HrPayrollAdjustments | null;
  settings?: PayrollCalcSettings;
  /** Payroll preview boundary (defaults to today in business timezone). */
  asOfDate?: Date;
  joiningDate?: string | null;
  calendar?: LeaveCalendarContext;
};

export type PayrollCalculationResult = {
  basicSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  breakdown: PayrollBreakdown;
};

function num(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Deductions reduced first when gross cannot cover the calculated total (attendance LOP is most variable). */
const DEDUCTION_REDUCE_ORDER = [
  "lop",
  "hr_additional_deduction",
  "other_ded",
  "income_tax",
  "pt",
  "esi",
  "pf",
] as const;

function sanitizeCurrencyAmount(value: number | string | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function normalizeBreakdownLines(lines: PayrollBreakdownLine[]): PayrollBreakdownLine[] {
  return lines
    .map((line) => ({
      ...line,
      amount: roundCurrency(Math.max(0, sanitizeCurrencyAmount(line.amount))),
    }))
    .filter((line) => line.amount > 0);
}

function reduceDeductionsToFitGross(
  deductions: PayrollBreakdownLine[],
  grossSalary: number,
): PayrollBreakdownLine[] {
  let lines = normalizeBreakdownLines(deductions);
  let total = roundCurrency(lines.reduce((sum, line) => sum + line.amount, 0));
  if (total <= grossSalary) return lines;

  let excess = roundCurrency(total - grossSalary);
  for (const code of DEDUCTION_REDUCE_ORDER) {
    if (excess <= 0) break;
    const index = lines.findIndex((line) => line.code === code);
    if (index < 0) continue;
    const reduceBy = Math.min(lines[index].amount, excess);
    lines[index] = {
      ...lines[index],
      amount: roundCurrency(lines[index].amount - reduceBy),
    };
    excess = roundCurrency(excess - reduceBy);
  }

  lines = lines.filter((line) => line.amount > 0);
  total = roundCurrency(lines.reduce((sum, line) => sum + line.amount, 0));
  if (total <= grossSalary) return lines;

  let remaining = roundCurrency(total - grossSalary);
  const largestFirst = [...lines].sort((a, b) => b.amount - a.amount);
  for (const line of largestFirst) {
    if (remaining <= 0) break;
    const index = lines.findIndex((entry) => entry.code === line.code);
    if (index < 0) continue;
    const reduceBy = Math.min(lines[index].amount, remaining);
    lines[index] = {
      ...lines[index],
      amount: roundCurrency(lines[index].amount - reduceBy),
    };
    remaining = roundCurrency(remaining - reduceBy);
  }

  return lines.filter((line) => line.amount > 0);
}

/** LOP is reflected in prorated payable gross; the LOP line is shown on payslips but does not reduce net again. */
function deductionsForNetPay(lines: PayrollBreakdownLine[]): PayrollBreakdownLine[] {
  return lines.filter((line) => line.code !== "lop");
}

/**
 * Ensures payroll item amounts satisfy payroll_items DB checks:
 * - all amounts >= 0
 * - net_salary = gross_salary - total_deductions
 */
export function normalizePayrollCalculationResult(
  result: PayrollCalculationResult,
): PayrollCalculationResult {
  const grossSalary = roundCurrency(Math.max(0, sanitizeCurrencyAmount(result.grossSalary)));
  const basicSalary = roundCurrency(Math.max(0, sanitizeCurrencyAmount(result.basicSalary)));
  const earnings = normalizeBreakdownLines(result.breakdown.earnings ?? []);
  const allDeductionLines = normalizeBreakdownLines(result.breakdown.deductions ?? []);
  const lopLines = allDeductionLines.filter((line) => line.code === "lop");
  const netDeductions = reduceDeductionsToFitGross(
    deductionsForNetPay(allDeductionLines),
    grossSalary,
  );

  let totalDeductions = roundCurrency(
    netDeductions.reduce((sum, line) => sum + line.amount, 0),
  );
  totalDeductions = roundCurrency(Math.min(totalDeductions, grossSalary));
  let netSalary = roundCurrency(grossSalary - totalDeductions);

  if (netSalary < 0) {
    totalDeductions = grossSalary;
    netSalary = 0;
  }

  // Reconcile any rounding drift so net_salary = gross_salary - total_deductions exactly.
  if (roundCurrency(grossSalary - totalDeductions) !== netSalary) {
    totalDeductions = roundCurrency(grossSalary - netSalary);
  }

  const totalAllowances = roundCurrency(Math.max(0, sanitizeCurrencyAmount(result.totalAllowances)));

  return {
    basicSalary,
    totalAllowances,
    totalDeductions,
    grossSalary,
    netSalary,
    breakdown: {
      ...result.breakdown,
      earnings,
      deductions: [...netDeductions, ...lopLines].filter((line) => line.amount > 0),
    },
  };
}

function parseComponents(raw: Record<string, unknown> | null): SalaryComponents {
  if (!raw) return {};
  return {
    specialAllowance: num(raw.specialAllowance as number),
    medical: num(raw.medical as number),
    pf: num(raw.pf as number),
    esi: num(raw.esi as number),
    professionalTax: num(raw.professionalTax as number),
    incomeTax: num(raw.incomeTax as number),
    other: num(raw.other as number),
  };
}

export function calendarDaysInMonth(month: number, year: number): number {
  return calendarDaysInYearMonth(month, year);
}

export const LATE_ENTRIES_PER_HALF_DAY_LOP = 3;

export function lateEntryPenaltyDays(lateDays: number): number {
  if (!(lateDays > 0)) return 0;
  return Math.floor(lateDays / LATE_ENTRIES_PER_HALF_DAY_LOP) * 0.5;
}

function resolveClosedPayrollWorkingDays(
  month: number,
  year: number,
  attendance: AttendanceSummary,
  calculation: WorkingDaysCalculation | undefined,
): number {
  const calendarDays = calendarDaysInMonth(month, year);
  if (calculation === "fixed_30") return 30;
  if (calculation === "working_days") {
    return Math.max(
      1,
      calendarDays - attendance.weekOffDays - attendance.holidayDays,
    );
  }
  return calendarDays;
}

export function resolvePayrollWorkingDays(
  month: number,
  year: number,
  attendance: AttendanceSummary,
  calculation: WorkingDaysCalculation | undefined,
  options?: {
    period?: PayrollApplicablePeriod;
    calendar?: LeaveCalendarContext;
    asOfDate?: Date;
    joiningDate?: string | null;
  },
): number {
  const period =
    options?.period ??
    resolvePayrollApplicablePeriod(month, year, {
      today: options?.asOfDate,
      joiningDate: options?.joiningDate,
    });

  if (period.kind === "future" || period.periodStart > period.periodEnd) {
    return 0;
  }

  if (!period.isClosed) {
    if (options?.calendar) {
      return countPayrollEligibleWorkingDays(
        period.periodStart,
        period.periodEnd,
        options.calendar,
      );
    }
    return Math.max(0, period.periodEnd >= period.periodStart ? 
      // Fallback without calendar: elapsed calendar days in the applicable window.
      Math.ceil(
        (new Date(`${period.periodEnd}T00:00:00.000Z`).getTime() -
          new Date(`${period.periodStart}T00:00:00.000Z`).getTime()) /
          86400000,
      ) + 1 : 0);
  }

  return resolveClosedPayrollWorkingDays(month, year, attendance, calculation);
}

/** Denominator for daily rate — full month when the period is still open. */
function resolveDailyRateWorkingDays(
  month: number,
  year: number,
  attendance: AttendanceSummary,
  calculation: WorkingDaysCalculation | undefined,
  options?: {
    period?: PayrollApplicablePeriod;
    calendar?: LeaveCalendarContext;
    asOfDate?: Date;
    joiningDate?: string | null;
  },
): number {
  const period =
    options?.period ??
    resolvePayrollApplicablePeriod(month, year, {
      today: options?.asOfDate,
      joiningDate: options?.joiningDate,
    });

  if (period.kind === "future" || period.periodStart > period.periodEnd) {
    return 0;
  }

  if (period.isClosed) {
    return Math.max(
      1,
      resolvePayrollWorkingDays(month, year, attendance, calculation, options),
    );
  }

  if (options?.calendar) {
    return Math.max(
      1,
      resolveFullMonthPayrollWorkingDays(month, year, options.calendar, {
        joiningDate: options.joiningDate,
      }),
    );
  }

  return Math.max(1, resolveClosedPayrollWorkingDays(month, year, attendance, calculation));
}

function computePresentPaidDays(
  attendance: AttendanceSummary,
  leave: LeaveMonthSummary,
  period: PayrollApplicablePeriod,
): number {
  if (period.kind === "future" || period.periodStart > period.periodEnd) {
    return 0;
  }
  return roundCurrency(
    attendance.presentDays + attendance.halfDays * 0.5 + leave.paidLeaveDays,
  );
}

function proratePayrollComponentAmount(amount: number, factor: number): number {
  if (!(amount > 0) || !(factor > 0)) return 0;
  return roundCurrency(amount * factor);
}

function prorateEarningsLines(
  lines: PayrollBreakdownLine[],
  factor: number,
): PayrollBreakdownLine[] {
  return lines
    .map((line) => ({
      ...line,
      amount: proratePayrollComponentAmount(line.amount, factor),
    }))
    .filter((line) => line.amount > 0);
}

export function resolveLopDays(input: {
  attendance: AttendanceSummary;
  leaveLopDays: number;
  paidLeaveDays: number;
  settings?: PayrollCalcSettings;
  lopDaysOverride?: number | null;
}): number {
  if (input.lopDaysOverride != null && Number.isFinite(input.lopDaysOverride)) {
    return Math.max(0, roundCurrency(input.lopDaysOverride));
  }

  const unpaidAbsence =
    input.attendance.absentDays +
    (input.settings?.halfDayDeduction === false ? 0 : input.attendance.halfDays * 0.5);
  const latePenalty = lateEntryPenaltyDays(input.attendance.lateDays ?? 0);
  let lop =
    input.leaveLopDays +
    unpaidAbsence +
    latePenalty +
    (input.attendance.sandwichLopDays ?? 0);
  if (input.settings?.paidLeaveDeduction) {
    lop += input.paidLeaveDays;
  }
  if (input.settings?.lossOfPayDeduction === false) {
    return 0;
  }
  return Math.max(0, roundCurrency(lop));
}

function emptyAttendanceBreakdown(
  workingDays: number,
  attendance: AttendanceSummary,
  leave: LeaveMonthSummary,
  lopDays: number,
  period: PayrollApplicablePeriod,
  options?: {
    dailyRate?: number;
    monthlyGrossSalary?: number;
    lopDeductionAmount?: number;
  },
) {
  return {
    workingDays,
    presentDays: attendance.presentDays,
    absentDays: attendance.absentDays,
    lopDays,
    leaveLopDays: leave.lopDays,
    overtimeHours: 0,
    leaveDays: attendance.onLeaveDays,
    paidDays: computePresentPaidDays(attendance, leave, period),
    paidLeaveDays: leave.paidLeaveDays,
    holidayCount: attendance.holidayDays,
    weekOffDays: attendance.weekOffDays,
    dailyRate: options?.dailyRate,
    monthlyGrossSalary: options?.monthlyGrossSalary,
    lopDeductionAmount: options?.lopDeductionAmount,
  };
}

function isPayrollReimbursementLineCode(code: string): boolean {
  const normalized = code.toLowerCase();
  return (
    normalized.startsWith("reimb_") ||
    normalized === "hr_reimbursement" ||
    normalized === "reimbursement"
  );
}

function sumReimbursementLines(
  lines: Array<{ code: string; amount: number }>,
): number {
  return roundCurrency(
    lines
      .filter((line) => isPayrollReimbursementLineCode(line.code))
      .reduce((sum, line) => sum + line.amount, 0),
  );
}

function sumNonReimbursementLines(
  lines: Array<{ code: string; amount: number }>,
): number {
  return roundCurrency(
    lines
      .filter((line) => !isPayrollReimbursementLineCode(line.code))
      .reduce((sum, line) => sum + line.amount, 0),
  );
}

export function calculateEmployeePayroll(
  input: PayrollCalculationInput,
): PayrollCalculationResult {
  const { month, year, salaryStructure, attendance, bonuses, reimbursements } = input;
  const leave: LeaveMonthSummary = input.leaveSummary ?? {
    lopDays: input.leaveLopDays ?? 0,
    paidLeaveDays: attendance.onLeaveDays,
  };
  const adjustments = input.adjustments ?? {};
  const period = resolvePayrollApplicablePeriod(month, year, {
    today: input.asOfDate,
    joiningDate: input.joiningDate,
  });
  const displayWorkingDays = resolvePayrollWorkingDays(
    month,
    year,
    attendance,
    input.settings?.workingDaysCalculation,
    {
      period,
      calendar: input.calendar,
      asOfDate: input.asOfDate,
      joiningDate: input.joiningDate,
    },
  );
  const lopDays = resolveLopDays({
    attendance,
    leaveLopDays: leave.lopDays,
    paidLeaveDays: leave.paidLeaveDays,
    settings: input.settings,
    lopDaysOverride: adjustments.lopDaysOverride,
  });
  const payableDays = computePresentPaidDays(attendance, leave, period);
  const workingDaysForRate = resolveDailyRateWorkingDays(
    month,
    year,
    attendance,
    input.settings?.workingDaysCalculation,
    {
      period,
      calendar: input.calendar,
      asOfDate: input.asOfDate,
      joiningDate: input.joiningDate,
    },
  );

  const extraEarnings = [
    ...bonuses.map((bonus) => ({
      code: `bonus_${bonus.bonus_type}`,
      label: `Bonus (${bonus.bonus_type})`,
      amount: roundCurrency(num(bonus.amount)),
      type: "earning" as const,
    })),
    ...reimbursements.map((reimbursement) => ({
      code: `reimb_${reimbursement.category}`,
      label: `Reimbursement (${reimbursement.category})`,
      amount: roundCurrency(num(reimbursement.amount)),
      type: "earning" as const,
    })),
  ].filter((line) => line.amount > 0);

  if (!salaryStructure) {
    const reimbTotal = sumReimbursementLines(extraEarnings);
    const salaryExtras = sumNonReimbursementLines(extraEarnings);
    const extraReimb = Math.max(0, roundCurrency(adjustments.reimbursements ?? 0));
    const totalReimbursement = roundCurrency(reimbTotal + extraReimb);
    return normalizePayrollCalculationResult({
      basicSalary: 0,
      totalAllowances: totalReimbursement,
      totalDeductions: 0,
      grossSalary: salaryExtras,
      netSalary: salaryExtras,
      breakdown: {
        earnings: extraEarnings,
        deductions: [],
        attendance: emptyAttendanceBreakdown(
          displayWorkingDays,
          attendance,
          leave,
          lopDays,
          period,
        ),
        notes: extraEarnings.length
          ? ["No salary structure configured. Totals include bonuses and expense claims."]
          : ["No salary structure configured"],
        hrAdjustments: adjustments,
        payrollLifecycle: { itemStatus: "draft" },
      },
    });
  }

  const components = parseComponents(salaryStructure.components);
  const split = resolveSalaryBreakdownFromStructure(salaryStructure);
  const basic = split.basic;
  const hra = split.hra;
  const lta = split.lta;
  const specialAllowance = split.special;

  const statutory = input.settings?.salaryComponents;
  const pf = statutory?.pf === false ? 0 : (components.pf ?? 0);
  const esi = statutory?.esi === false ? 0 : (components.esi ?? 0);
  const professionalTax =
    statutory?.professionalTax === false ? 0 : (components.professionalTax ?? 0);
  const structureTds =
    statutory?.incomeTax === false ? 0 : (components.incomeTax ?? 0);
  const structureOtherDeduction = components.other ?? 0;

  const salaryGross = roundCurrency(basic + hra + lta + specialAllowance);
  const rawPerDay = workingDaysForRate > 0 ? salaryGross / workingDaysForRate : 0;
  const perDay = roundCurrency(rawPerDay);
  const payableGross = roundCurrency(rawPerDay * payableDays);
  const lopDeduction = roundCurrency(rawPerDay * lopDays);
  const prorateFactor = salaryGross > 0 ? payableGross / salaryGross : 0;
  const proratedBasic = proratePayrollComponentAmount(basic, prorateFactor);
  const proratedHra = proratePayrollComponentAmount(hra, prorateFactor);
  const proratedLta = proratePayrollComponentAmount(lta, prorateFactor);
  const proratedSpecial = proratePayrollComponentAmount(specialAllowance, prorateFactor);

  const tds =
    adjustments.tdsOverride != null && Number.isFinite(adjustments.tdsOverride)
      ? Math.max(0, roundCurrency(adjustments.tdsOverride))
      : structureTds;
  const otherDeduction =
    adjustments.otherDeductionsOverride != null &&
    Number.isFinite(adjustments.otherDeductionsOverride)
      ? Math.max(0, roundCurrency(adjustments.otherDeductionsOverride))
      : structureOtherDeduction;

  const extraBonus = Math.max(0, roundCurrency(adjustments.bonus ?? 0));
  const incentive = Math.max(0, roundCurrency(adjustments.incentive ?? 0));
  const extraReimb = Math.max(0, roundCurrency(adjustments.reimbursements ?? 0));
  const additionalEarnings = Math.max(0, roundCurrency(adjustments.additionalEarnings ?? 0));
  const additionalDeductions = Math.max(0, roundCurrency(adjustments.additionalDeductions ?? 0));

  const earnings = prorateEarningsLines(buildStandardEarningsLines(split), prorateFactor);

  earnings.push(...extraEarnings);

  if (extraBonus > 0) {
    earnings.push({
      code: "hr_bonus",
      label: "Bonus (HR adjustment)",
      amount: extraBonus,
      type: "earning",
    });
  }
  if (incentive > 0) {
    earnings.push({
      code: "hr_incentive",
      label: "Incentive",
      amount: incentive,
      type: "earning",
    });
  }
  if (extraReimb > 0) {
    earnings.push({
      code: "hr_reimbursement",
      label: "Reimbursement (HR adjustment)",
      amount: extraReimb,
      type: "earning",
    });
  }
  if (additionalEarnings > 0) {
    earnings.push({
      code: "hr_additional_earning",
      label: "Additional earnings",
      amount: additionalEarnings,
      type: "earning",
    });
  }

  const deductions = [
    { code: "pf", label: "Provident Fund (PF)", amount: pf, type: "deduction" as const },
    { code: "esi", label: "Employee State Insurance (ESI)", amount: esi, type: "deduction" as const },
    {
      code: "pt",
      label: "Professional Tax",
      amount: professionalTax,
      type: "deduction" as const,
    },
    {
      code: "income_tax",
      label: "Tax Deducted at Source (TDS)",
      amount: tds,
      type: "deduction" as const,
    },
    {
      code: "other_ded",
      label: "Other Applicable Deductions",
      amount: otherDeduction,
      type: "deduction" as const,
    },
    {
      code: "lop",
      label: "Loss of Pay (LOP)",
      amount: lopDeduction,
      type: "deduction" as const,
    },
  ];

  if (additionalDeductions > 0) {
    deductions.push({
      code: "hr_additional_deduction",
      label: "Additional deduction",
      amount: additionalDeductions,
      type: "deduction",
    });
  }

  const reimbFromClaims = sumReimbursementLines(extraEarnings);
  const salaryExtrasFromClaims = sumNonReimbursementLines(extraEarnings);

  const extraTotals = roundCurrency(
    salaryExtrasFromClaims + additionalEarnings,
  );
  const grossSalary = roundCurrency(payableGross + extraTotals);
  const totalDeductions = roundCurrency(
    deductions
      .filter((line) => line.amount > 0 && line.code !== "lop")
      .reduce((sum, line) => sum + line.amount, 0),
  );
  const netSalary = roundCurrency(grossSalary - totalDeductions);
  const totalAllowances = roundCurrency(
    Math.max(0, proratedHra + proratedLta + proratedSpecial) + extraReimb + reimbFromClaims,
  );

  const lifecycleStatus: PayrollItemLifecycleStatus = adjustments.itemStatus ?? "draft";

  return normalizePayrollCalculationResult({
    basicSalary: proratedBasic,
    totalAllowances,
    totalDeductions,
    grossSalary,
    netSalary,
    breakdown: {
      earnings: earnings.filter((line) => line.amount > 0),
      deductions: deductions.filter((line) => line.amount > 0),
      attendance: emptyAttendanceBreakdown(
        displayWorkingDays,
        attendance,
        leave,
        lopDays,
        period,
        {
          dailyRate: perDay,
          monthlyGrossSalary: salaryGross,
          lopDeductionAmount: lopDeduction,
        },
      ),
      salaryStructureSnapshot: {
        salaryStructureId: salaryStructure.id,
        basicSalary: basic,
        hraAmount: hra,
        transportAllowance: lta,
        otherAllowances: 0,
        components: {
          specialAllowance,
          medical: 0,
          pf,
          esi,
          professionalTax,
          incomeTax: tds,
          other: otherDeduction,
          ...(salaryStructure.components ?? {}),
        },
      },
      hrAdjustments: adjustments,
      payrollLifecycle: { itemStatus: lifecycleStatus },
      notes: [
        `Daily rate ₹${roundCurrency(perDay).toLocaleString("en-IN")} × ${payableDays} payable day(s).`,
        lopDays > 0
          ? `LOP deduction ₹${roundCurrency(lopDeduction).toLocaleString("en-IN")} (${lopDays} day(s) at daily rate).`
          : null,
      ].filter(Boolean) as string[],
    },
  });
}
