import "server-only";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getDocumentTypeIdByCode } from "@/lib/documents/services/document-queries";
import {
  isPayslipOfficiallyReleasedToEmployee,
} from "@/lib/payroll/services/payslip-publication";
import {
  dedupePayslipEmployeeDocuments,
  upsertPayslipEmployeeDocument,
} from "@/lib/payroll/services/payslip-to-employee-document";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/auth";
import type { PayslipDetail, PayrollBreakdown } from "@/types/payroll";

type PayslipSyncRow = {
  id: string;
  payslip_number: string;
  storage_path: string | null;
  email_sent_at: string | null;
  published_at: string | null;
  employee_id: string;
  payrolls:
    | { payroll_month: string; organization_id: string }
    | { payroll_month: string; organization_id: string }[]
    | null;
  payroll_items:
    | { breakdown: PayrollBreakdown | null }
    | { breakdown: PayrollBreakdown | null }[]
    | null;
};

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Ensure every officially released payslip for an employee has a Documents →
 * Payroll & Tax → Payslips mirror row, reusing the existing payslip `storage_path`
 * (no duplicate PDF upload when the file already exists).
 *
 * Idempotent. Soft-fails per payslip so Documents explorer still loads.
 * Returns the number of payslips that were mirrored (or already mirrored).
 */
export async function syncReleasedPayslipsToEmployeeDocuments(
  _supabase: AuthSupabaseClient,
  input: {
    organizationId: string;
    employeeId: string;
    actorUserId?: string | null;
    /** When provided, missing PDFs can be generated via the normal store path. */
    profile?: UserProfile | null;
  },
): Promise<number> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .schema("hrms")
    .from("payslips")
    .select(
      `
        id,
        payslip_number,
        storage_path,
        email_sent_at,
        published_at,
        employee_id,
        payrolls!inner (payroll_month, organization_id),
        payroll_items:payroll_item_id (breakdown)
      `,
    )
    .eq("employee_id", input.employeeId)
    .eq("is_current", true)
    .is("deleted_at", null);

  if (error) {
    // Soft-fail: do not use console.error (Next.js overlay). Explorer still loads.
    console.warn("[payroll] syncReleasedPayslipsToEmployeeDocuments query failed", {
      employeeId: input.employeeId,
      message: error.message,
    });
    return 0;
  }

  let mirrored = 0;

  for (const row of (data ?? []) as PayslipSyncRow[]) {
    const payroll = unwrapRelation(row.payrolls);
    if (!payroll || payroll.organization_id !== input.organizationId) continue;

    const item = unwrapRelation(row.payroll_items);
    const released = isPayslipOfficiallyReleasedToEmployee({
      publishedAt: row.published_at,
      emailSentAt: row.email_sent_at,
      payrollLifecycle: item?.breakdown?.payrollLifecycle,
    });
    if (!released) continue;

    try {
      let storagePath = row.storage_path;

      if (!storagePath) {
        if (!input.profile) continue;
        const { getPayslipById } = await import(
          "@/lib/payroll/services/payroll-mutations"
        );
        const { storePayslipPdf } = await import(
          "@/lib/payroll/services/payslip-storage"
        );
        const detail = await getPayslipById(_supabase, input.profile, row.id, {
          bypassAccessCheck: true,
        });
        if (!detail) continue;
        storagePath = await storePayslipPdf(
          _supabase,
          detail as PayslipDetail,
          input.organizationId,
          { actorUserId: input.actorUserId ?? input.profile.userId },
        );
        mirrored += 1;
        continue; // storePayslipPdf already upserts the Documents row
      }

      await upsertPayslipEmployeeDocument({
        organizationId: input.organizationId,
        payslip: {
          id: row.id,
          payslipNumber: row.payslip_number,
          payrollMonth: payroll.payroll_month,
          employee: {
            id: row.employee_id,
            employeeCode: "",
            firstName: "",
            lastName: "",
            email: "",
            departmentName: null,
            designationTitle: null,
            employmentType: null,
            branchName: null,
            dateOfJoining: null,
            pan: null,
            uan: null,
            pfNumber: null,
          },
        },
        storagePath,
        actorUserId: input.actorUserId ?? null,
      });
      mirrored += 1;
    } catch (syncError) {
      console.warn("[payroll] syncReleasedPayslipsToEmployeeDocuments failed", {
        payslipId: row.id,
        message: syncError instanceof Error ? syncError.message : String(syncError),
      });
    }
  }

  // Final pass: collapse any leftover sync-created duplicates for this employee.
  try {
    const documentTypeId = await getDocumentTypeIdByCode(
      admin as unknown as AuthSupabaseClient,
      input.organizationId,
      "PAYSLIP",
    );
    if (documentTypeId) {
      await dedupePayslipEmployeeDocuments({
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        documentTypeId,
      });
    }
  } catch (dedupeError) {
    console.warn("[payroll] dedupePayslipEmployeeDocuments failed", {
      employeeId: input.employeeId,
      message: dedupeError instanceof Error ? dedupeError.message : String(dedupeError),
    });
  }

  return mirrored;
}
