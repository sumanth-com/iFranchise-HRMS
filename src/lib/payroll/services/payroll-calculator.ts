import type { PayrollBreakdown, SalaryComponents } from "@/types/payroll";
import { getMonthDateRange, roundCurrency } from "@/lib/payroll/services/payroll-utils";

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
};

export type BonusRow = { amount: number | string; bonus_type: string };
export type ReimbursementRow = { amount: number | string; category: string };

export type PayrollCalculationInput = {
  month: number;
  year: number;
  salaryStructure: SalaryStructureRow | null;
  attendance: AttendanceSummary;
  leaveLopDays: number;
  bonuses: BonusRow[];
  reimbursements: ReimbursementRow[];
};

export type PayrollCalculationResult = {
  basicSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  breakdown: PayrollBreakdown;
};

function num(value: number | string): number {
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

export function calculateEmployeePayroll(
  input: PayrollCalculationInput,
): PayrollCalculationResult {
  const { month, year, salaryStructure, attendance, leaveLopDays, bonuses, reimbursements } =
    input;

  const { workingDays } = getMonthDateRange(month, year);

  if (!salaryStructure) {
    return {
      basicSalary: 0,
      totalAllowances: 0,
      totalDeductions: 0,
      grossSalary: 0,
      netSalary: 0,
      breakdown: {
        earnings: [],
        deductions: [],
        attendance: {
          workingDays,
          presentDays: attendance.presentDays,
          absentDays: attendance.absentDays,
          lopDays: attendance.absentDays + leaveLopDays,
          leaveLopDays,
          overtimeHours: attendance.overtimeHours,
        },
        notes: ["No salary structure configured"],
      },
    };
  }

  const components = parseComponents(salaryStructure.components);
  const basic = num(salaryStructure.basic_salary);
  const hra = num(salaryStructure.hra_amount);
  const transport = num(salaryStructure.transport_allowance);
  const otherAllowances = num(salaryStructure.other_allowances);
  const specialAllowance = components.specialAllowance ?? 0;
  const medical = components.medical ?? 0;
  const pf = components.pf ?? 0;
  const esi = components.esi ?? 0;
  const professionalTax = components.professionalTax ?? 0;
  const incomeTax = components.incomeTax ?? 0;
  const otherDeduction = components.other ?? 0;

  const fullGross =
    basic + hra + transport + otherAllowances + specialAllowance + medical;
  const fullDeductions = pf + esi + professionalTax + incomeTax + otherDeduction;

  const lopDays =
    attendance.absentDays + leaveLopDays + attendance.halfDays * 0.5;
  const paidDays = Math.max(0, workingDays - lopDays);
  const paidRatio = workingDays > 0 ? paidDays / workingDays : 0;

  const perDayGross = fullGross / workingDays;
  const lopDeduction = roundCurrency(perDayGross * lopDays);

  const earnedBasic = roundCurrency(basic * paidRatio);
  const earnedHra = roundCurrency(hra * paidRatio);
  const earnedTransport = roundCurrency(transport * paidRatio);
  const earnedOther = roundCurrency(
    (otherAllowances + specialAllowance + medical) * paidRatio,
  );

  const hourlyRate = workingDays > 0 ? basic / (workingDays * 8) : 0;
  const overtimePay = roundCurrency(attendance.overtimeHours * hourlyRate * 1.5);

  const bonusTotal = roundCurrency(
    bonuses.reduce((sum, b) => sum + num(b.amount), 0),
  );
  const reimbursementTotal = roundCurrency(
    reimbursements.reduce((sum, r) => sum + num(r.amount), 0),
  );

  const earnedDeductions = roundCurrency(fullDeductions * paidRatio);

  const earnings = [
    { code: "basic", label: "Basic Salary", amount: earnedBasic, type: "earning" as const },
    { code: "hra", label: "HRA", amount: earnedHra, type: "earning" as const },
    {
      code: "transport",
      label: "Travel Allowance",
      amount: earnedTransport,
      type: "earning" as const,
    },
    {
      code: "allowances",
      label: "Special & Other Allowances",
      amount: earnedOther,
      type: "earning" as const,
    },
  ];

  if (overtimePay > 0) {
    earnings.push({
      code: "overtime",
      label: "Overtime",
      amount: overtimePay,
      type: "earning",
    });
  }

  for (const bonus of bonuses) {
    earnings.push({
      code: `bonus_${bonus.bonus_type}`,
      label: `Bonus (${bonus.bonus_type})`,
      amount: roundCurrency(num(bonus.amount)),
      type: "earning",
    });
  }

  for (const reimbursement of reimbursements) {
    earnings.push({
      code: `reimb_${reimbursement.category}`,
      label: `Reimbursement (${reimbursement.category})`,
      amount: roundCurrency(num(reimbursement.amount)),
      type: "earning",
    });
  }

  const deductions = [
    { code: "pf", label: "Provident Fund", amount: roundCurrency(pf * paidRatio), type: "deduction" as const },
    { code: "esi", label: "ESI", amount: roundCurrency(esi * paidRatio), type: "deduction" as const },
    {
      code: "pt",
      label: "Professional Tax",
      amount: roundCurrency(professionalTax * paidRatio),
      type: "deduction" as const,
    },
    {
      code: "income_tax",
      label: "Income Tax",
      amount: roundCurrency(incomeTax * paidRatio),
      type: "deduction" as const,
    },
    {
      code: "other_ded",
      label: "Other Deductions",
      amount: roundCurrency(otherDeduction * paidRatio),
      type: "deduction" as const,
    },
  ];

  if (lopDeduction > 0) {
    deductions.push({
      code: "lop",
      label: "Loss of Pay",
      amount: lopDeduction,
      type: "deduction",
    });
  }

  const grossSalary = roundCurrency(
    earnings.reduce((sum, line) => sum + line.amount, 0),
  );
  const totalDeductions = roundCurrency(
    deductions.reduce((sum, line) => sum + line.amount, 0),
  );
  const netSalary = roundCurrency(grossSalary - totalDeductions);

  const totalAllowances = roundCurrency(
    earnedHra + earnedTransport + earnedOther + overtimePay + bonusTotal + reimbursementTotal,
  );

  return {
    basicSalary: earnedBasic,
    totalAllowances,
    totalDeductions,
    grossSalary,
    netSalary,
    breakdown: {
      earnings: earnings.filter((e) => e.amount > 0),
      deductions: deductions.filter((d) => d.amount > 0),
      attendance: {
        workingDays,
        presentDays: attendance.presentDays,
        absentDays: attendance.absentDays,
        lopDays,
        leaveLopDays,
        overtimeHours: attendance.overtimeHours,
      },
    },
  };
}
