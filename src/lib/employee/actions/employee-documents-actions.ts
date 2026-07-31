"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { SELF_DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import {
  employeeDeleteDocument,
  employeeRenameDocument,
} from "@/lib/employee/services/employee-documents-mutations";
import { createSignedDocumentUrl, uploadAndCreateDocument } from "@/lib/documents/services/document-mutations";
import { fromHrms } from "@/lib/documents/services/documents-utils";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { assertOrganizationStoragePath } from "@/lib/security/storage-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uploadMetaSchema = z.object({
  documentTypeId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  replaceDocumentId: z.string().uuid().optional().nullable(),
});

function revalidate() {
  revalidatePath(EMPLOYEE_ROUTES.documents);
  revalidatePath(SELF_DOCUMENTS_ROUTES.list);
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

    const parsed = uploadMetaSchema.parse({
      documentTypeId: formData.get("documentTypeId"),
      title: formData.get("title"),
      replaceDocumentId: formData.get("replaceDocumentId") || null,
    });

    const id = await uploadAndCreateDocument(
      supabase,
      profile,
      {
        employeeId: profile.employee.id,
        documentTypeId: parsed.documentTypeId,
        title: parsed.title,
        issuedDate: null,
        expiryDate: null,
        notes: null,
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
      .select("id, storage_path, employee_id")
      .eq("storage_path", storagePath)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!doc || doc.employee_id !== profile.employee.id) {
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
