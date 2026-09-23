import "server-only";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { fromHrms } from "@/lib/documents/services/documents-utils";
import { getDocumentTypeIdByCode } from "@/lib/documents/services/document-queries";
import { getDocumentSettings, nextDocumentNumber } from "@/lib/documents/services/document-settings";
import { ensureExplorerDocumentTypes } from "@/lib/employee/services/ensure-explorer-document-types";
import { formatPayrollMonthLabel } from "@/lib/payroll/services/payroll-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PayslipDetail } from "@/types/payroll";

function payrollPeriodParts(payrollMonth: string): {
  year: number;
  month: number;
  notes: string;
} | null {
  const normalized =
    payrollMonth.length === 7
      ? `${payrollMonth}-01`
      : payrollMonth.length >= 10
        ? payrollMonth.slice(0, 10)
        : payrollMonth;
  const match = normalized.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return {
    year,
    month,
    notes: `period:${match[1]}-${match[2]}`,
  };
}

/**
 * Mirror a released/archived payslip PDF into Documents → Payroll & Tax → Payslips.
 * Idempotent on payslip identity (document_number = payslip_number) and month period notes.
 * Failures are logged by callers — must not block payroll release/email.
 */
export async function upsertPayslipEmployeeDocument(input: {
  organizationId: string;
  payslip: Pick<
    PayslipDetail,
    "id" | "payslipNumber" | "payrollMonth" | "employee"
  >;
  storagePath: string;
  fileSizeBytes?: number | null;
  actorUserId?: string | null;
}): Promise<void> {
  const period = payrollPeriodParts(input.payslip.payrollMonth);
  if (!period) {
    throw new Error("Invalid payslip payroll month.");
  }

  const admin = createAdminClient() as unknown as AuthSupabaseClient;
  await ensureExplorerDocumentTypes(admin, input.organizationId);

  const documentTypeId = await getDocumentTypeIdByCode(
    admin,
    input.organizationId,
    "PAYSLIP",
  );
  if (!documentTypeId) {
    throw new Error("PAYSLIP document type is missing.");
  }

  const title = `Payslip · ${formatPayrollMonthLabel(input.payslip.payrollMonth)}`;
  const fileName = `${input.payslip.payslipNumber}.pdf`;
  const issuedDate = new Date().toISOString().slice(0, 10);
  const actorId = input.actorUserId ?? null;
  const fileSizeBytes =
    typeof input.fileSizeBytes === "number" && Number.isFinite(input.fileSizeBytes)
      ? Math.max(0, Math.round(input.fileSizeBytes))
      : null;

  // Prefer exact payslip identity, then same calendar month (one official payslip slot).
  const { data: byNumber, error: byNumberError } = await fromHrms(
    admin,
    "employee_documents",
  )
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("employee_id", input.payslip.employee.id)
    .eq("document_type_id", documentTypeId)
    .eq("document_number", input.payslip.payslipNumber)
    .is("deleted_at", null)
    .is("archived_at", null)
    .maybeSingle();

  if (byNumberError) {
    throw new Error(byNumberError.message);
  }

  let existingId = byNumber?.id as string | undefined;

  if (!existingId) {
    const { data: byPeriod, error: byPeriodError } = await fromHrms(
      admin,
      "employee_documents",
    )
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("employee_id", input.payslip.employee.id)
      .eq("document_type_id", documentTypeId)
      .eq("notes", period.notes)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();

    if (byPeriodError) {
      throw new Error(byPeriodError.message);
    }
    existingId = byPeriod?.id as string | undefined;
  }

  if (existingId) {
    const { error: updateError } = await fromHrms(admin, "employee_documents")
      .update({
        title,
        document_number: input.payslip.payslipNumber,
        storage_path: input.storagePath,
        file_name: fileName,
        mime_type: "application/pdf",
        ...(fileSizeBytes != null ? { file_size_bytes: fileSizeBytes } : {}),
        document_status: "verified",
        source: "generated",
        is_official: true,
        notes: period.notes,
        document_year: period.year,
        document_month: period.month,
        issued_date: issuedDate,
        verified_at: new Date().toISOString(),
        verified_by: actorId,
        updated_by: actorId,
      })
      .eq("id", existingId);

    if (updateError) {
      throw new Error(updateError.message);
    }
    return;
  }

  const settings = await getDocumentSettings(admin, input.organizationId);
  // Prefer stable payslip number as document identity; fall back to sequential DOC-n.
  const documentNumber = input.payslip.payslipNumber?.trim()
    ? input.payslip.payslipNumber.trim()
    : await nextDocumentNumber(
        admin,
        input.organizationId,
        settings.documentNumberPrefix,
      );

  const { error: insertError } = await fromHrms(admin, "employee_documents").insert({
    organization_id: input.organizationId,
    employee_id: input.payslip.employee.id,
    document_type_id: documentTypeId,
    title,
    document_number: documentNumber,
    storage_path: input.storagePath,
    file_name: fileName,
    mime_type: "application/pdf",
    file_size_bytes: fileSizeBytes ?? 0,
    document_status: "verified",
    source: "generated",
    is_official: true,
    issued_date: issuedDate,
    notes: period.notes,
    document_year: period.year,
    document_month: period.month,
    verified_at: new Date().toISOString(),
    verified_by: actorId,
    status: "active",
    created_by: actorId,
    updated_by: actorId,
  });

  if (insertError) {
    // Concurrent release of the same payslip — treat as success if identity already exists.
    const duplicate =
      insertError.code === "23505" ||
      insertError.message.toLowerCase().includes("duplicate");
    if (duplicate) return;
    throw new Error(insertError.message);
  }
}
