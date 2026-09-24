import "server-only";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { fromHrms } from "@/lib/documents/services/documents-utils";
import { getDocumentTypeIdByCode } from "@/lib/documents/services/document-queries";
import { getDocumentSettings, nextDocumentNumber } from "@/lib/documents/services/document-settings";
import { ensureExplorerDocumentTypes } from "@/lib/employee/services/ensure-explorer-document-types";
import {
  buildPayslipDocumentNotes,
  extractPayslipIdFromDocumentNotes,
  payrollPeriodParts,
} from "@/lib/payroll/services/payslip-employee-document-identity";
import { formatPayrollMonthLabel } from "@/lib/payroll/services/payroll-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PayslipDetail } from "@/types/payroll";

export {
  buildPayslipDocumentNotes,
  extractPayslipIdFromDocumentNotes,
  payrollPeriodParts,
} from "@/lib/payroll/services/payslip-employee-document-identity";

async function resolvePayslipFileSizeBytes(
  storagePath: string,
  provided?: number | null,
): Promise<number> {
  if (typeof provided === "number" && Number.isFinite(provided) && provided > 0) {
    return Math.round(provided);
  }
  try {
    const slash = storagePath.lastIndexOf("/");
    const folder = slash >= 0 ? storagePath.slice(0, slash) : "";
    const name = slash >= 0 ? storagePath.slice(slash + 1) : storagePath;
    const { data: listed } = await createAdminClient()
      .storage.from("employee-documents")
      .list(folder || undefined, { search: name, limit: 20 });
    const match = (listed ?? []).find((entry) => entry.name === name);
    const rawSize = Number(
      (match?.metadata as { size?: number } | null | undefined)?.size ?? 0,
    );
    if (Number.isFinite(rawSize) && rawSize > 0) return Math.round(rawSize);
  } catch {
    // Fall through.
  }
  return 1;
}

type ExistingPayslipDoc = {
  id: string;
  notes: string | null;
  document_number: string | null;
  storage_path: string | null;
  created_at: string;
};

function isSamePayslipMirror(
  row: ExistingPayslipDoc,
  input: {
    payslipId: string;
    payslipNumber: string;
    storagePath: string;
    periodNotes: string;
  },
): boolean {
  const noteId = extractPayslipIdFromDocumentNotes(row.notes);
  if (noteId && noteId === input.payslipId.toLowerCase()) return true;
  if (row.document_number === input.payslipNumber) return true;
  if (row.storage_path === input.storagePath) return true;
  const notes = String(row.notes ?? "");
  if (notes === input.periodNotes) return true;
  if (notes.includes(input.periodNotes)) return true;
  return false;
}

/**
 * Soft-delete duplicate PAYSLIP employee_documents for one employee, keeping a single
 * canonical row per released payslip (by payslip_id note, storage_path, or document_number).
 */
export async function dedupePayslipEmployeeDocuments(input: {
  organizationId: string;
  employeeId: string;
  documentTypeId: string;
  /** Prefer keeping the row that matches this payslip when present. */
  preferPayslipId?: string | null;
  preferStoragePath?: string | null;
  preferDocumentNumber?: string | null;
}): Promise<string | null> {
  const admin = createAdminClient() as unknown as AuthSupabaseClient;

  const { data, error } = await fromHrms(admin, "employee_documents")
    .select("id, notes, document_number, storage_path, created_at")
    .eq("organization_id", input.organizationId)
    .eq("employee_id", input.employeeId)
    .eq("document_type_id", input.documentTypeId)
    .eq("source", "generated")
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ExistingPayslipDoc[];
  if (rows.length === 0) return null;

  const groups = new Map<string, ExistingPayslipDoc[]>();
  for (const row of rows) {
    const payslipId = extractPayslipIdFromDocumentNotes(row.notes);
    const key =
      (payslipId ? `id:${payslipId}` : null) ??
      (row.storage_path ? `path:${row.storage_path}` : null) ??
      (row.document_number ? `num:${row.document_number}` : null) ??
      `row:${row.id}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  let keepId: string | null = null;
  const nowIso = new Date().toISOString();

  for (const [, group] of groups) {
    if (group.length === 0) continue;

    const preferred =
      (input.preferPayslipId &&
        group.find(
          (row) =>
            extractPayslipIdFromDocumentNotes(row.notes) ===
            input.preferPayslipId!.toLowerCase(),
        )) ||
      (input.preferStoragePath &&
        group.find((row) => row.storage_path === input.preferStoragePath)) ||
      (input.preferDocumentNumber &&
        group.find((row) => row.document_number === input.preferDocumentNumber)) ||
      group[0];

    if (!preferred) continue;
    if (
      input.preferPayslipId &&
      extractPayslipIdFromDocumentNotes(preferred.notes) ===
        input.preferPayslipId.toLowerCase()
    ) {
      keepId = preferred.id;
    } else if (!keepId) {
      keepId = preferred.id;
    }

    const duplicateIds = group.filter((row) => row.id !== preferred.id).map((row) => row.id);
    if (duplicateIds.length === 0) continue;

    const { error: deleteError } = await fromHrms(admin, "employee_documents")
      .update({ deleted_at: nowIso, updated_at: nowIso })
      .in("id", duplicateIds);
    if (deleteError) throw new Error(deleteError.message);
  }

  return keepId;
}

/**
 * Mirror a released/archived payslip PDF into Documents → Payroll & Tax → Payslips.
 * Idempotent on payslip.id (encoded in notes). Soft-deletes sync duplicates.
 */
export async function upsertPayslipEmployeeDocument(input: {
  organizationId: string;
  payslip: Pick<
    PayslipDetail,
    "id" | "payslipNumber" | "payrollMonth" | "employee"
  > & { issuedAt?: string | null };
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
  // Prefer payroll-month date over sync/wall-clock date for the document card.
  const issuedDate =
    typeof input.payslip.issuedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(input.payslip.issuedAt)
      ? input.payslip.issuedAt.slice(0, 10)
      : period.issuedDate;
  const notes = buildPayslipDocumentNotes(input.payslip.id, period.periodNotes);
  const actorId = input.actorUserId ?? null;
  const fileSizeBytes = await resolvePayslipFileSizeBytes(
    input.storagePath,
    input.fileSizeBytes,
  );

  // Load all active PAYSLIP mirrors for this employee and match in-process
  // (avoids fragile PostgREST .or filters and concurrent maybeSingle races).
  const { data: existingRows, error: existingError } = await fromHrms(
    admin,
    "employee_documents",
  )
    .select("id, notes, document_number, storage_path, created_at")
    .eq("organization_id", input.organizationId)
    .eq("employee_id", input.payslip.employee.id)
    .eq("document_type_id", documentTypeId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (existingError) {
    throw new Error(existingError.message);
  }

  const matchInput = {
    payslipId: input.payslip.id,
    payslipNumber: input.payslip.payslipNumber,
    storagePath: input.storagePath,
    periodNotes: period.periodNotes,
  };

  const matches = ((existingRows ?? []) as ExistingPayslipDoc[]).filter((row) =>
    isSamePayslipMirror(row, matchInput),
  );

  const keep =
    matches.find(
      (row) =>
        extractPayslipIdFromDocumentNotes(row.notes) === input.payslip.id.toLowerCase(),
    ) ??
    matches[0] ??
    null;

  if (keep) {
    const duplicateIds = matches.filter((row) => row.id !== keep.id).map((row) => row.id);
    if (duplicateIds.length > 0) {
      const nowIso = new Date().toISOString();
      const { error: deleteError } = await fromHrms(admin, "employee_documents")
        .update({ deleted_at: nowIso, updated_at: nowIso })
        .in("id", duplicateIds);
      if (deleteError) throw new Error(deleteError.message);
    }

    const { error: updateError } = await fromHrms(admin, "employee_documents")
      .update({
        title,
        document_number: input.payslip.payslipNumber,
        storage_path: input.storagePath,
        file_name: fileName,
        mime_type: "application/pdf",
        file_size_bytes: fileSizeBytes,
        document_status: "verified",
        source: "generated",
        is_official: true,
        notes,
        document_year: period.year,
        document_month: period.month,
        issued_date: issuedDate,
        verified_at: new Date().toISOString(),
        verified_by: actorId,
        updated_by: actorId,
      })
      .eq("id", keep.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
    return;
  }

  // Broader cleanup for any other generated payslip dupes for this employee.
  await dedupePayslipEmployeeDocuments({
    organizationId: input.organizationId,
    employeeId: input.payslip.employee.id,
    documentTypeId,
    preferPayslipId: input.payslip.id,
    preferStoragePath: input.storagePath,
    preferDocumentNumber: input.payslip.payslipNumber,
  });

  const settings = await getDocumentSettings(admin, input.organizationId);
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
    file_size_bytes: fileSizeBytes,
    document_status: "verified",
    source: "generated",
    is_official: true,
    issued_date: issuedDate,
    notes,
    document_year: period.year,
    document_month: period.month,
    verified_at: new Date().toISOString(),
    verified_by: actorId,
    status: "active",
    created_by: actorId,
    updated_by: actorId,
  });

  if (insertError) {
    const duplicate =
      insertError.code === "23505" ||
      insertError.message.toLowerCase().includes("duplicate");
    if (duplicate) {
      // Race: another request inserted first — keep one and refresh metadata.
      await dedupePayslipEmployeeDocuments({
        organizationId: input.organizationId,
        employeeId: input.payslip.employee.id,
        documentTypeId,
        preferPayslipId: input.payslip.id,
        preferStoragePath: input.storagePath,
        preferDocumentNumber: input.payslip.payslipNumber,
      });
      const { data: racedRows } = await fromHrms(admin, "employee_documents")
        .select("id, notes, document_number, storage_path, created_at")
        .eq("organization_id", input.organizationId)
        .eq("employee_id", input.payslip.employee.id)
        .eq("document_type_id", documentTypeId)
        .is("deleted_at", null)
        .is("archived_at", null)
        .order("created_at", { ascending: true });
      const racedKeep =
        ((racedRows ?? []) as ExistingPayslipDoc[]).find((row) =>
          isSamePayslipMirror(row, matchInput),
        ) ?? null;
      if (racedKeep) {
        await fromHrms(admin, "employee_documents")
          .update({
            title,
            document_number: input.payslip.payslipNumber,
            storage_path: input.storagePath,
            file_name: fileName,
            mime_type: "application/pdf",
            file_size_bytes: fileSizeBytes,
            document_status: "verified",
            source: "generated",
            is_official: true,
            notes,
            document_year: period.year,
            document_month: period.month,
            issued_date: issuedDate,
            verified_at: new Date().toISOString(),
            verified_by: actorId,
            updated_by: actorId,
          })
          .eq("id", racedKeep.id);
      }
      return;
    }
    throw new Error(insertError.message);
  }
}
