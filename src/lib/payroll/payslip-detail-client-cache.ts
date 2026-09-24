"use client";

import { getEmployeePayslipDetailAction } from "@/lib/employee/actions/employee-payroll-actions";
import { fetchPayslipDetailAction } from "@/lib/payroll/actions";
import { prefetchCachedModalDetail } from "@/lib/ui/use-cached-modal-detail";
import type { PayslipDetail } from "@/types/payroll";

/** Session caches shared by Payroll + Documents payslip drawers. */
export const employeePayslipDetailCache = new Map<string, PayslipDetail>();
export const employeePayslipDetailInflight = new Map<
  string,
  Promise<PayslipDetail | null>
>();

export const hrPayslipDetailCache = new Map<string, PayslipDetail>();
export const hrPayslipDetailInflight = new Map<string, Promise<PayslipDetail | null>>();

export function prefetchEmployeePayslipDetail(payslipId: string) {
  return prefetchCachedModalDetail(
    payslipId,
    getEmployeePayslipDetailAction,
    employeePayslipDetailCache,
    employeePayslipDetailInflight,
  );
}

export function prefetchHrPayslipDetail(payslipId: string) {
  return prefetchCachedModalDetail(
    payslipId,
    fetchPayslipDetailAction,
    hrPayslipDetailCache,
    hrPayslipDetailInflight,
  );
}
