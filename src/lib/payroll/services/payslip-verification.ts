import { format, parseISO } from "date-fns";

import { siteConfig } from "@/config/site";
import {
  formatPayrollMonthLabel,
  officialPayslipNumber,
  resolveDisplayedPayslipNumber,
} from "@/lib/payroll/services/payroll-utils";
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

  const payslipSelect = `
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
      `;

  const direct = await fromHrms(admin, "payslips")
    .select(payslipSelect)
    .eq("payslip_number", normalizedRef)
    .is("deleted_at", null)
    .maybeSingle();

  let data = direct.data;
  if (direct.error || !data) {
    const parsed = normalizedRef.toUpperCase().match(/^PS-(\d{6})-([A-Z0-9]+)$/);
    const month = parsed ? Number.parseInt(parsed[1].slice(4, 6), 10) : 0;
    if (!parsed || month < 1 || month > 12) return { valid: false };
    const payrollMonth = `${parsed[1].slice(0, 4)}-${parsed[1].slice(4, 6)}-01`;
    const { data: employees } = await fromHrms(admin, "employees")
      .select("id, employee_code")
      .ilike("employee_code", parsed[2])
      .is("deleted_at", null);
    const employee = (employees ?? []).find(
      (row: { id: string; employee_code: string | null }) =>
        officialPayslipNumber(row.employee_code, payrollMonth) === `PS-${parsed[1]}-${parsed[2]}`,
    );
    if (!employee) return { valid: false };
    const byPeriod = await fromHrms(admin, "payslips")
      .select(payslipSelect)
      .eq("employee_id", employee.id)
      .eq("payrolls.payroll_month", payrollMonth)
      .is("deleted_at", null)
      .order("is_current", { ascending: false })
      .limit(1);
    data = byPeriod.data?.[0] ?? null;
    if (byPeriod.error || !data) return { valid: false };
  }

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
    payslipNumber: resolveDisplayedPayslipNumber({
      storedNumber: data.payslip_number,
      employeeCode: employee.employee_code,
      payrollMonth,
    }),
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
