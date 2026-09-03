import type {
  HrPayrollAdjustments,
  PayrollBreakdown,
  PayrollItemLifecycleStatus,
  SalaryComponents,
} from "@/types/payroll";
import type { WorkingDaysCalculation } from "@/types/payroll-settings";
import {
  calendarDaysInYearMonth,
  monthlyGrossPerDay,
} from "@/lib/payroll/salary-structure-period";
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
  return Number(value) || 0;
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

export function resolvePayrollWorkingDays(
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
) {
  return {
    workingDays,
    presentDays: attendance.presentDays,
    absentDays: attendance.absentDays,
    lopDays,
    leaveLopDays: leave.lopDays,
    overtimeHours: 0,
    leaveDays: attendance.onLeaveDays,
    paidDays: Math.max(0, workingDays - lopDays),
    paidLeaveDays: leave.paidLeaveDays,
    holidayCount: attendance.holidayDays,
    weekOffDays: attendance.weekOffDays,
  };
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
  const workingDays = resolvePayrollWorkingDays(
    month,
    year,
    attendance,
    input.settings?.workingDaysCalculation,
  );
  const lopDays = resolveLopDays({
    attendance,
    leaveLopDays: leave.lopDays,
    paidLeaveDays: leave.paidLeaveDays,
    settings: input.settings,
    lopDaysOverride: adjustments.lopDaysOverride,
  });

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
    const extraTotal = roundCurrency(
      extraEarnings.reduce((sum, line) => sum + line.amount, 0),
    );
    return {
      basicSalary: 0,
      totalAllowances: extraTotal,
      totalDeductions: 0,
      grossSalary: extraTotal,
      netSalary: extraTotal,
      breakdown: {
        earnings: extraEarnings,
        deductions: [],
        attendance: emptyAttendanceBreakdown(workingDays, attendance, leave, lopDays),
        notes: extraEarnings.length
          ? ["No salary structure configured. Totals include bonuses and expense claims."]
          : ["No salary structure configured"],
        hrAdjustments: adjustments,
        payrollLifecycle: { itemStatus: "draft" },
      },
    };
  }

  const components = parseComponents(salaryStructure.components);
  const basic = num(salaryStructure.basic_salary);
  const hra = num(salaryStructure.hra_amount);
  const lta = num(salaryStructure.transport_allowance);
  const storedOther = num(salaryStructure.other_allowances);
  const specialAllowance = components.specialAllowance ?? 0;
  const medical = components.medical ?? 0;
  const leftoverOther = Math.max(0, roundCurrency(storedOther - specialAllowance - medical));

  const statutory = input.settings?.salaryComponents;
  const pf = statutory?.pf === false ? 0 : (components.pf ?? 0);
  const esi = statutory?.esi === false ? 0 : (components.esi ?? 0);
  const professionalTax =
    statutory?.professionalTax === false ? 0 : (components.professionalTax ?? 0);
  const structureTds =
    statutory?.incomeTax === false ? 0 : (components.incomeTax ?? 0);
  const structureOtherDeduction = components.other ?? 0;

  const salaryGross = roundCurrency(
    basic + hra + lta + specialAllowance + medical + leftoverOther,
  );
  const perDay = monthlyGrossPerDay(salaryGross, workingDays);
  const lopDeduction = roundCurrency(perDay * lopDays);

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

  const earnings = [
    { code: "basic", label: "Basic Salary", amount: basic, type: "earning" as const },
    { code: "hra", label: "House Rent Allowance (HRA)", amount: hra, type: "earning" as const },
    {
      code: "special_allowance",
      label: "Special Allowance",
      amount: specialAllowance,
      type: "earning" as const,
    },
    {
      code: "transport",
      label: "Leave Travel Allowance (LTA)",
      amount: lta,
      type: "earning" as const,
    },
    {
      code: "medical",
      label: "Medical Allowance",
      amount: medical,
      type: "earning" as const,
    },
    {
      code: "other_allowances",
      label: "Other Allowances",
      amount: leftoverOther,
      type: "earning" as const,
    },
  ];

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
      label: "Other Deductions",
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

  const grossSalary = roundCurrency(
    earnings.filter((line) => line.amount > 0).reduce((sum, line) => sum + line.amount, 0),
  );
  const totalDeductions = roundCurrency(
    deductions.filter((line) => line.amount > 0).reduce((sum, line) => sum + line.amount, 0),
  );
  const netSalary = roundCurrency(grossSalary - totalDeductions);
  const totalAllowances = roundCurrency(Math.max(0, salaryGross - basic));

  const lifecycleStatus: PayrollItemLifecycleStatus = adjustments.itemStatus ?? "draft";

  return {
    basicSalary: basic,
    totalAllowances,
    totalDeductions,
    grossSalary,
    netSalary,
    breakdown: {
      earnings: earnings.filter((line) => line.amount > 0),
      deductions: deductions.filter((line) => line.amount > 0),
      attendance: emptyAttendanceBreakdown(workingDays, attendance, leave, lopDays),
      salaryStructureSnapshot: {
        salaryStructureId: salaryStructure.id,
        basicSalary: basic,
        hraAmount: hra,
        transportAllowance: lta,
        otherAllowances: leftoverOther + specialAllowance + medical,
        components: {
          specialAllowance,
          medical,
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
        `Per-day salary ₹${roundCurrency(perDay).toLocaleString("en-IN")} × ${lopDays} LOP day(s).`,
      ],
    },
  };
}
