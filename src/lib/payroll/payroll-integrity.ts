import {
  isExcludedFromTeamPayslips,
} from "@/lib/employee/directory-listing";
import {
  isEmployeeAppVisible,
  normalizeEmployeeEmail,
} from "@/lib/employees/app-hidden";
import { employeeJoinedBy } from "@/lib/payroll/salary-structure-period";
import { roundCurrency } from "@/lib/payroll/services/payroll-utils";

export const PAYROLL_INTEGRITY_MARKER = "[PAYROLL_INTEGRITY]";

export type PayrollIntegrityEmployee = {
  id?: string | null;
  employee_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  date_of_joining?: string | null;
  app_hidden_at?: string | null;
  deleted_at?: string | null;
  designationTitle?: string | null;
};

export type PayrollIntegrityItem = {
  id?: string;
  employeeId: string;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  employee: PayrollIntegrityEmployee | null;
};

export type PayrollIntegrityIssue = {
  code:
    | "header_mismatch"
    | "hidden_or_excluded"
    | "joined_after_period"
    | "duplicate_employee";
  message: string;
  employeeCode?: string;
};

export type PayrollIntegrityReport = {
  ok: boolean;
  issues: PayrollIntegrityIssue[];
  eligibleItems: PayrollIntegrityItem[];
  totals: {
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
  };
};

export function isPayrollEligibleEmployee(
  employee: PayrollIntegrityEmployee | null | undefined,
  periodEnd?: string,
): boolean {
  if (!employee) return false;
  if (
    !isEmployeeAppVisible({
      email: employee.email,
      app_hidden_at: employee.app_hidden_at,
      deleted_at: employee.deleted_at,
    })
  ) {
    return false;
  }
  if (
    isExcludedFromTeamPayslips(employee.employee_code, {
      employeeCode: employee.employee_code,
      firstName: employee.first_name,
      lastName: employee.last_name,
      designationTitle: employee.designationTitle,
    })
  ) {
    return false;
  }
  if (periodEnd && !employeeJoinedBy(employee.date_of_joining, periodEnd)) {
    return false;
  }
  return true;
}

export function ineligibilityReason(
  employee: PayrollIntegrityEmployee | null | undefined,
  periodEnd?: string,
): PayrollIntegrityIssue | null {
  if (!employee) {
    return { code: "hidden_or_excluded", message: "Payroll item has no employee record." };
  }
  const code = employee.employee_code ?? "unknown";
  if (
    !isEmployeeAppVisible({
      email: employee.email,
      app_hidden_at: employee.app_hidden_at,
      deleted_at: employee.deleted_at,
    })
  ) {
    return {
      code: "hidden_or_excluded",
      employeeCode: code,
      message: `${code} is app-hidden or a duplicate Gmail profile and cannot be included in payroll.`,
    };
  }
  if (
    isExcludedFromTeamPayslips(employee.employee_code, {
      employeeCode: employee.employee_code,
      firstName: employee.first_name,
      lastName: employee.last_name,
      designationTitle: employee.designationTitle,
    })
  ) {
    return {
      code: "hidden_or_excluded",
      employeeCode: code,
      message: `${code} is excluded from Company Payroll and payslips.`,
    };
  }
  if (periodEnd && !employeeJoinedBy(employee.date_of_joining, periodEnd)) {
    return {
      code: "joined_after_period",
      employeeCode: code,
      message: `${code} joined ${String(employee.date_of_joining).slice(0, 10)} after payroll period ending ${periodEnd}.`,
    };
  }
  return null;
}

export function dedupePayrollEmployees<T extends PayrollIntegrityEmployee & { id: string }>(
  employees: T[],
): T[] {
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const unique: T[] = [];
  for (const employee of employees) {
    if (seenIds.has(employee.id)) continue;
    const email = normalizeEmployeeEmail(employee.email);
    if (email && seenEmails.has(email)) continue;
    seenIds.add(employee.id);
    if (email) seenEmails.add(email);
    unique.push(employee);
  }
  return unique;
}

export function canRewritePayrollHeader(input: {
  payrollStatus: string;
  isLocked?: boolean | null;
  payrollMonth: string;
  today?: Date;
}): boolean {
  if (input.isLocked) return false;
  const status = input.payrollStatus;
  if (status === "paid" || status === "approved" || status === "cancelled") {
    return false;
  }
  if (status === "draft" || status === "processing") return true;
  if (status === "processed") {
    const today = input.today ?? new Date();
    const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    return String(input.payrollMonth).slice(0, 7) >= currentYm;
  }
  return false;
}

export function evaluatePayrollIntegrity(input: {
  items: PayrollIntegrityItem[];
  headerGross: number;
  headerDeductions: number;
  headerNet: number;
  periodEnd: string;
}): PayrollIntegrityReport {
  const issues: PayrollIntegrityIssue[] = [];
  const eligibleItems: PayrollIntegrityItem[] = [];
  const seenEmployeeIds = new Set<string>();
  const seenEmails = new Map<string, string>();

  for (const item of input.items) {
    const reason = ineligibilityReason(item.employee, input.periodEnd);
    if (reason) {
      issues.push(reason);
      continue;
    }
    if (seenEmployeeIds.has(item.employeeId)) {
      issues.push({
        code: "duplicate_employee",
        employeeCode: item.employee?.employee_code ?? item.employeeId,
        message: `Employee ${item.employee?.employee_code ?? item.employeeId} is counted more than once in this payroll run.`,
      });
      continue;
    }
    seenEmployeeIds.add(item.employeeId);
    const email = normalizeEmployeeEmail(item.employee?.email);
    if (email) {
      const previous = seenEmails.get(email);
      if (previous && previous !== item.employeeId) {
        issues.push({
          code: "duplicate_employee",
          employeeCode: item.employee?.employee_code ?? item.employeeId,
          message: `Duplicate employee email ${email} is counted more than once in this payroll run.`,
        });
        continue;
      }
      seenEmails.set(email, item.employeeId);
    }
    eligibleItems.push(item);
  }

  const totals = {
    totalGross: roundCurrency(
      eligibleItems.reduce((sum, row) => sum + Number(row.grossSalary ?? 0), 0),
    ),
    totalDeductions: roundCurrency(
      eligibleItems.reduce((sum, row) => sum + Number(row.totalDeductions ?? 0), 0),
    ),
    totalNet: roundCurrency(
      eligibleItems.reduce((sum, row) => sum + Number(row.netSalary ?? 0), 0),
    ),
  };

  if (
    Math.abs(roundCurrency(input.headerGross) - totals.totalGross) > 0.05 ||
    Math.abs(roundCurrency(input.headerDeductions) - totals.totalDeductions) > 0.05 ||
    Math.abs(roundCurrency(input.headerNet) - totals.totalNet) > 0.05
  ) {
    issues.push({
      code: "header_mismatch",
      message: `Payroll header totals do not match valid items (header net ${roundCurrency(input.headerNet)} vs valid items ${totals.totalNet}). Review before finalizing. Historical paid/processed amounts were not changed.`,
    });
  }

  return {
    ok: issues.length === 0,
    issues,
    eligibleItems,
    totals,
  };
}

export function formatPayrollIntegrityNotes(issues: PayrollIntegrityIssue[]): string {
  const lines = [
    PAYROLL_INTEGRITY_MARKER,
    "HR/Admin review required. Historical payroll amounts were not auto-corrected.",
    ...issues.map((issue) => `- [${issue.code}] ${issue.message}`),
  ];
  return lines.join("\n");
}

export function mergePayrollIntegrityNotes(
  existing: string | null | undefined,
  issues: PayrollIntegrityIssue[],
): string | null {
  const stripped = String(existing ?? "")
    .replace(
      new RegExp(`${PAYROLL_INTEGRITY_MARKER.replace("[", "\\[")}[\\s\\S]*$`),
      "",
    )
    .trim();
  if (issues.length === 0) return stripped || null;
  return [stripped, formatPayrollIntegrityNotes(issues)].filter(Boolean).join("\n\n");
}

export class PayrollIntegrityError extends Error {
  issues: PayrollIntegrityIssue[];

  constructor(issues: PayrollIntegrityIssue[]) {
    super(
      issues.map((issue) => issue.message).join(" ") ||
        "Payroll integrity check failed. Review Company Payroll before finalizing.",
    );
    this.name = "PayrollIntegrityError";
    this.issues = issues;
  }
}
