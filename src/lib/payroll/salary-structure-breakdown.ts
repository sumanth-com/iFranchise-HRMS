import { roundCurrency } from "@/lib/payroll/services/payroll-utils";
import type { PayrollBreakdownLine } from "@/types/payroll";

export const SALARY_BREAKDOWN_RATES = {
  basic: 0.5,
  hra: 0.25,
  special: 0.15,
  lta: 0.1,
} as const;

export const STANDARD_EARNING_LABELS = {
  basic: "Basic Salary",
  hra: "House Rent Allowance (HRA)",
  lta: "Leave Travel Allowance (LTA)",
  special: "Special Allowance",
} as const;

const PF_WAGE_CEILING = 15_000;
const PF_EMPLOYEE_RATE = 0.12;
const ESI_GROSS_CEILING = 21_000;
const ESI_EMPLOYEE_RATE = 0.0075;
export const DEFAULT_PROFESSIONAL_TAX = 200;

export type SalaryBreakdown = {
  basic: number;
  hra: number;
  special: number;
  lta: number;
};

export function parseSalaryAmount(raw: string): number {
  const normalized = raw.replace(/₹/g, "").replace(/,/g, "").trim();
  if (!normalized) return 0;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function splitMonthlyGross(gross: number): SalaryBreakdown {
  const safeGross = Number.isFinite(gross) && gross > 0 ? roundCurrency(gross) : 0;
  if (safeGross <= 0) {
    return { basic: 0, hra: 0, special: 0, lta: 0 };
  }

  const basic = roundCurrency(safeGross * SALARY_BREAKDOWN_RATES.basic);
  const hra = roundCurrency(safeGross * SALARY_BREAKDOWN_RATES.hra);
  const special = roundCurrency(safeGross * SALARY_BREAKDOWN_RATES.special);
  const lta = roundCurrency(safeGross - basic - hra - special);

  return { basic, hra, special, lta };
}

/** Map monthly gross into persisted salary-structure earning fields (50/25/10/15). */
export function salaryBreakdownToStructureFields(gross: number): {
  basicSalary: number;
  hraAmount: number;
  transportAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  specialAllowance: number;
} {
  const split = splitMonthlyGross(gross);
  return {
    basicSalary: split.basic,
    hraAmount: split.hra,
    transportAllowance: split.lta,
    otherAllowances: 0,
    grossSalary: split.basic + split.hra + split.special + split.lta,
    specialAllowance: split.special,
  };
}

/** Resolve the canonical earning split from stored gross (preferred) or component sums. */
export function resolveSalaryBreakdownFromStructure(input: {
  gross_salary?: number | string | null;
  basic_salary?: number | string | null;
  hra_amount?: number | string | null;
  transport_allowance?: number | string | null;
  other_allowances?: number | string | null;
  components?: Record<string, unknown> | null;
}): SalaryBreakdown {
  const gross = Number(input.gross_salary ?? 0);
  if (Number.isFinite(gross) && gross > 0) {
    return splitMonthlyGross(gross);
  }

  const components = input.components ?? {};
  const special = Number(components.specialAllowance ?? 0);
  const medical = Number(components.medical ?? 0);
  const rawGross = roundCurrency(
    Number(input.basic_salary ?? 0) +
      Number(input.hra_amount ?? 0) +
      Number(input.transport_allowance ?? 0) +
      Number(input.other_allowances ?? 0) +
      special +
      medical,
  );
  return splitMonthlyGross(rawGross);
}

export function buildStandardEarningsLines(
  split: SalaryBreakdown,
  options?: { includeZero?: boolean },
): PayrollBreakdownLine[] {
  const lines: PayrollBreakdownLine[] = [
    {
      code: "basic",
      label: STANDARD_EARNING_LABELS.basic,
      amount: split.basic,
      type: "earning",
    },
    {
      code: "hra",
      label: STANDARD_EARNING_LABELS.hra,
      amount: split.hra,
      type: "earning",
    },
    {
      code: "transport",
      label: STANDARD_EARNING_LABELS.lta,
      amount: split.lta,
      type: "earning",
    },
    {
      code: "special_allowance",
      label: STANDARD_EARNING_LABELS.special,
      amount: split.special,
      type: "earning",
    },
  ];
  if (options?.includeZero) return lines;
  return lines.filter((line) => line.amount > 0);
}

export function statutoryPf(basicSalary: number): number {
  if (!(basicSalary > 0)) return 0;
  return roundCurrency(Math.min(basicSalary, PF_WAGE_CEILING) * PF_EMPLOYEE_RATE);
}

export function statutoryEsi(monthlyGross: number): number {
  if (!(monthlyGross > 0) || monthlyGross > ESI_GROSS_CEILING) return 0;
  return roundCurrency(monthlyGross * ESI_EMPLOYEE_RATE);
}

export function isEsiApplicable(monthlyGross: number): boolean {
  return monthlyGross > 0 && monthlyGross <= ESI_GROSS_CEILING;
}

export function totalStatutoryDeductions(input: {
  pf: number;
  esi: number;
  tds: number;
  professionalTax: number;
  other: number;
}): number {
  return roundCurrency(
    Math.max(0, input.pf) +
      Math.max(0, input.esi) +
      Math.max(0, input.tds) +
      Math.max(0, input.professionalTax) +
      Math.max(0, input.other),
  );
}
