import "server-only";

import { officialPayslipNumber } from "@/lib/payroll/services/payroll-utils";
import { createAdminClient } from "@/lib/supabase/admin";

const backfillByOrganization = new Map<string, Promise<void>>();

type PayslipNumberRow = {
  id: string;
  payslip_number: string;
  employees:
    | { employee_code: string | null }
    | { employee_code: string | null }[]
    | null;
  payrolls:
    | { payroll_month: string | null }
    | { payroll_month: string | null }[]
    | null;
};

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "23505" ||
    /duplicate key|unique constraint/i.test(error.message ?? "")
  );
}

async function mirrorOfficialNumber(payslipId: string, officialNumber: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .schema("hrms")
    .from("payslip_versions")
    .update({ payslip_number: officialNumber })
    .eq("payslip_id", payslipId)
    .neq("payslip_number", officialNumber);

  await admin
    .schema("hrms")
    .from("employee_documents")
    .update({
      document_number: officialNumber,
      file_name: `${officialNumber}.pdf`,
    })
    .ilike("notes", `%payslip_id:${payslipId}%`)
    .is("deleted_at", null);
}

/** Persist PS-YYYYMM-EMPLOYEECODE. Leaves storage paths and payroll amounts unchanged. */
export async function persistOfficialPayslipNumber(
  payslipId: string,
  officialNumber: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .schema("hrms")
    .from("payslips")
    .update({ payslip_number: officialNumber })
    .eq("id", payslipId)
    .neq("payslip_number", officialNumber);

  if (error) {
    if (isUniqueViolation(error)) {
      await mirrorOfficialNumber(payslipId, officialNumber);
      return;
    }
    throw new Error(error.message);
  }

  await mirrorOfficialNumber(payslipId, officialNumber);
}

async function backfillOrganizationPayslipNumbers(organizationId: string): Promise<void> {
  const admin = createAdminClient();
  const pageSize = 500;
  let from = 0;

  for (;;) {
    const { data, error } = await admin
      .schema("hrms")
      .from("payslips")
      .select(
        `
          id,
          payslip_number,
          employees!inner (employee_code),
          payrolls!inner (payroll_month, organization_id)
        `,
      )
      .eq("payrolls.organization_id", organizationId)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as PayslipNumberRow[];
    for (const row of rows) {
      const employee = unwrapRelation(row.employees);
      const payroll = unwrapRelation(row.payrolls);
      const official = officialPayslipNumber(
        employee?.employee_code,
        payroll?.payroll_month,
      );
      if (!official || official === row.payslip_number) {
        if (official) await mirrorOfficialNumber(row.id, official);
        continue;
      }
      await persistOfficialPayslipNumber(row.id, official);
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }
}

/** Correct stored payslip numbers for every month in this organization, once per process. */
export function ensureOfficialPayslipNumbers(organizationId: string): Promise<void> {
  const existing = backfillByOrganization.get(organizationId);
  if (existing) return existing;

  const pending = backfillOrganizationPayslipNumbers(organizationId).catch((error) => {
    backfillByOrganization.delete(organizationId);
    console.warn("[payroll] payslip number backfill failed", {
      organizationId,
      message: error instanceof Error ? error.message : "unknown",
    });
  });
  backfillByOrganization.set(organizationId, pending);
  return pending;
}
