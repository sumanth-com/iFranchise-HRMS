"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { SELF_DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import {
  isMultiFileDocumentCode,
  isRenameableDocumentCode,
} from "@/lib/employee/documents/categories";
import {
  employeeDeleteDocument,
  employeeRenameDocument,
} from "@/lib/employee/services/employee-documents-mutations";
import { createSignedDocumentUrl, uploadAndCreateDocument } from "@/lib/documents/services/document-mutations";
import { fromHrms, unwrapRelation } from "@/lib/documents/services/documents-utils";
import {
  EMPLOYEE_DOCUMENT_MAX_BYTES,
  EMPLOYEE_DOCUMENT_STORAGE_LIMIT_BYTES,
  DOCUMENT_YEAR_OPTIONS,
} from "@/lib/documents/storage-paths";
import { SOFT_STORAGE_LIMIT_BYTES } from "@/lib/employee/services/employee-documents-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { assertOrganizationStoragePath } from "@/lib/security/storage-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/auth";

const uploadMetaSchema = z.object({
  documentTypeId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  replaceDocumentId: z.string().uuid().optional().nullable(),
  issuedDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

function revalidate() {
  revalidatePath(EMPLOYEE_ROUTES.documents);
  revalidatePath(SELF_DOCUMENTS_ROUTES.list);
}

function canAccessEmployeeDocument(
  profile: UserProfile,
  employeeId: string,
  organizationId: string | null | undefined,
) {
  if (organizationId !== profile.employee.organizationId) {
    return false;
  }

  if (employeeId === profile.employee.id) {
    return true;
  }

  return hasPermission(profile.permissionCodes, "documents.view")
    || hasPermission(profile.permissionCodes, "documents.manage");
}

export async function employeeUploadDocumentAction(formData: FormData) {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      "documents.upload",
    ]);
    const supabase = await createClient();

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false as const, message: "Please choose a file to upload" };
    }

    if (file.size > EMPLOYEE_DOCUMENT_MAX_BYTES) {
      return {
        success: false as const,
        message: "File exceeds the maximum size of 10 MB. Please choose a smaller file.",
      };
    }

    const parsed = uploadMetaSchema.parse({
      documentTypeId: formData.get("documentTypeId"),
      title: formData.get("title"),
      replaceDocumentId: formData.get("replaceDocumentId") || null,
      issuedDate: formData.get("issuedDate") || null,
      notes: formData.get("notes") || null,
    });

    const { data: docType } = await fromHrms(supabase, "document_types")
      .select("name, code")
      .eq("id", parsed.documentTypeId)
      .maybeSingle();

    const typeCode = String((docType as { code?: string } | null)?.code ?? "").toUpperCase();
    const typeName = String((docType as { name?: string } | null)?.name ?? "").trim();
    const title =
      isMultiFileDocumentCode(typeCode) || isRenameableDocumentCode(typeCode)
        ? parsed.title
        : typeName || parsed.title;

    // Prevent duplicate period uploads (same month/year or FY) unless replacing.
    if (
      !parsed.replaceDocumentId &&
      parsed.notes &&
      /^period:\d{4}(-\d{2})?$/.test(parsed.notes) &&
      (typeCode === "PAYSLIP" ||
        typeCode === "FORM_16" ||
        typeCode === "PREVIOUS_PAYSLIPS" ||
        typeCode === "TAX_DOCUMENT")
    ) {
      const yearMatch = parsed.notes.match(/^period:(\d{4})/);
      const year = yearMatch?.[1];
      if (year && !(DOCUMENT_YEAR_OPTIONS as readonly string[]).includes(year)) {
        return {
          success: false as const,
          message: "Year must be 2025, 2026, 2027, or 2028.",
        };
      }
      if (typeCode !== "TAX_DOCUMENT") {
        const { data: duplicates } = await fromHrms(supabase, "employee_documents")
          .select("id, title")
          .eq("employee_id", profile.employee.id)
          .eq("organization_id", profile.employee.organizationId)
          .eq("document_type_id", parsed.documentTypeId)
          .eq("notes", parsed.notes)
          .is("deleted_at", null)
          .is("archived_at", null)
          .limit(1);
        if ((duplicates ?? []).length > 0) {
          return {
            success: false as const,
            message:
              typeCode === "FORM_16"
                ? "A Form 16 for this financial year already exists. Use Reupload on that card to replace it."
                : "A payslip for this month and year already exists. Use Reupload on that card to replace it.",
          };
        }
      }
    }

    if (!parsed.replaceDocumentId) {
      const { data: usageRows } = await fromHrms(supabase, "employee_documents")
        .select("file_size_bytes")
        .eq("employee_id", profile.employee.id)
        .eq("organization_id", profile.employee.organizationId)
        .is("deleted_at", null)
        .is("archived_at", null);
      const usedBytes = (usageRows ?? []).reduce(
        (sum: number, row: { file_size_bytes?: number | null }) =>
          sum + Number(row.file_size_bytes ?? 0),
        0,
      );
      const limitBytes = SOFT_STORAGE_LIMIT_BYTES || EMPLOYEE_DOCUMENT_STORAGE_LIMIT_BYTES;
      if (usedBytes + file.size > limitBytes) {
        return {
          success: false as const,
          message: "Storage limit reached (500 MB). Delete unused files and try again.",
        };
      }
    }

    const id = await uploadAndCreateDocument(
      supabase,
      profile,
      {
        employeeId: profile.employee.id,
        documentTypeId: parsed.documentTypeId,
        title,
        issuedDate: parsed.issuedDate ?? null,
        expiryDate: null,
        notes: parsed.notes ?? null,
        replaceDocumentId: parsed.replaceDocumentId ?? null,
      },
      file,
    );

    revalidate();
    return { success: true as const, data: id };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to upload document",
    };
  }
}

export async function employeeRenameDocumentAction(documentId: string, title: string) {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      "documents.upload",
    ]);
    const supabase = await createClient();
    await employeeRenameDocument(supabase, profile, documentId, title);
    revalidate();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to rename document",
    };
  }
}

export async function employeeDeleteDocumentAction(documentId: string) {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      "documents.upload",
    ]);
    const supabase = await createClient();
    await employeeDeleteDocument(supabase, profile, documentId);
    revalidate();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to delete document",
    };
  }
}

export async function employeeGetDocumentUrlAction(storagePath: string) {
  try {
    const profile = await requireServerAnyPermission([PORTAL_PERMISSIONS.employee, "documents.view"]);
    const supabase = await createClient();

    assertOrganizationStoragePath(storagePath, profile.employee.organizationId);

    const { data: doc, error } = await fromHrms(supabase, "employee_documents")
      .select("id, storage_path, employee_id, employees:employee_id!inner(organization_id)")
      .eq("storage_path", storagePath)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!doc) {
      return { success: false as const, message: "Document not found" };
    }

    const employee = unwrapRelation(doc.employees);
    if (
      !canAccessEmployeeDocument(
        profile,
        doc.employee_id as string,
        employee?.organization_id as string | undefined,
      )
    ) {
      return { success: false as const, message: "Document not found" };
    }

    const admin = createAdminClient();
    const url = await createSignedDocumentUrl(admin, storagePath);
    if (!url) return { success: false as const, message: "Unable to open this file" };
    return { success: true as const, data: url };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to open file",
    };
  }
}

export async function employeeDownloadDocumentAction(storagePath: string, fileName: string) {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      "documents.view",
    ]);
    const supabase = await createClient();

    assertOrganizationStoragePath(storagePath, profile.employee.organizationId);

    const { data: doc, error } = await fromHrms(supabase, "employee_documents")
      .select(
        "id, storage_path, file_name, employee_id, employees:employee_id!inner(organization_id)",
      )
      .eq("storage_path", storagePath)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!doc) {
      return { success: false as const, message: "Document not found" };
    }

    const employee = unwrapRelation(doc.employees);
    if (
      !canAccessEmployeeDocument(
        profile,
        doc.employee_id as string,
        employee?.organization_id as string | undefined,
      )
    ) {
      return { success: false as const, message: "Document not found" };
    }

    const admin = createAdminClient();
    const downloadName = fileName.trim() || (doc.file_name as string) || "document";
    const url = await createSignedDocumentUrl(admin, storagePath, { download: downloadName });
    if (!url) return { success: false as const, message: "Unable to download this file" };
    return { success: true as const, data: url };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to download file",
    };
  }
}
