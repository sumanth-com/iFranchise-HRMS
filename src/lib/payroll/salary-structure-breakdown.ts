import { roundCurrency } from "@/lib/payroll/services/payroll-utils";

export const SALARY_BREAKDOWN_RATES = {
  basic: 0.5,
  hra: 0.25,
  special: 0.15,
  lta: 0.1,
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
