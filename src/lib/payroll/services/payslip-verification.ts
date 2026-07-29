import { format, parseISO } from "date-fns";

import { siteConfig } from "@/config/site";
import { formatPayrollMonthLabel } from "@/lib/payroll/services/payroll-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { fromHrms, unwrapRelation } from "@/lib/reports/services/reports-utils";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";

export type PayslipVerificationResult = {
  valid: true;
  employeeName: string;
  employeeCode: string;
  payslipNumber: string;
  payrollMonth: string;
  payrollMonthLabel: string;
  verificationStatus: string;
  companyName: string;
};

export type PayslipVerificationResponse =
  | PayslipVerificationResult
  | { valid: false };

function getAdminClient(): AuthSupabaseClient | null {
  if (!hasSupabaseServiceRoleEnv()) return null;
  return createAdminClient() as unknown as AuthSupabaseClient;
}

export async function verifyPayslipByReference(
  payslipRef: string,
): Promise<PayslipVerificationResponse> {
  const admin = getAdminClient();
  if (!admin) return { valid: false };

  const normalizedRef = decodeURIComponent(payslipRef).trim();
  if (!normalizedRef) return { valid: false };

  const { data, error } = await fromHrms(admin, "payslips")
    .select(
      `
        id,
        payslip_number,
        status,
        published_at,
        deleted_at,
        archived_at,
        employees:employee_id (
          employee_code,
          first_name,
          last_name,
          deleted_at
        ),
        payrolls:payroll_id (
          payroll_month,
          payroll_status,
          organizations:organization_id (name)
        )
      `,
    )
    .eq("payslip_number", normalizedRef)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return { valid: false };

  if (data.archived_at) return { valid: false };

  const employee = unwrapRelation(data.employees) as {
    employee_code?: string;
    first_name?: string;
    last_name?: string;
    deleted_at?: string | null;
  } | null;

  if (!employee || employee.deleted_at) return { valid: false };

  const payroll = unwrapRelation(data.payrolls) as {
    payroll_month?: string;
    payroll_status?: string;
    organizations?: { name?: string } | { name?: string }[] | null;
  } | null;

  const organization = unwrapRelation(payroll?.organizations ?? null) as { name?: string } | null;
  const payrollMonth = payroll?.payroll_month?.slice(0, 10) ?? "";
  const verificationStatus = data.published_at
    ? "Verified — Authentic Payslip"
    : "Pending Official Publication";

  return {
    valid: true,
    employeeName: `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim(),
    employeeCode: employee.employee_code ?? "—",
    payslipNumber: data.payslip_number,
    payrollMonth,
    payrollMonthLabel: payrollMonth
      ? formatPayrollMonthLabel(payrollMonth)
      : "—",
    verificationStatus,
    companyName: organization?.name ?? siteConfig.name,
  };
}

export function buildPayslipVerificationUrl(payslipNumber: string): string {
  const base = siteConfig.url.replace(/\/$/, "");
  return `${base}/verify/payslip/${encodeURIComponent(payslipNumber)}`;
}
