"use server";

import { revalidatePath } from "next/cache";

import { DOCUMENTS_ROUTES, DOCUMENTS_STORAGE_BUCKET, SELF_DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import {
  archiveDocument,
  createSignedDocumentUrl,
  createTemplate,
  deleteCompanyLetter,
  deleteTemplate,
  generateCompanyLetter,
  publishLetter,
  updateTemplate,
  uploadAndCreateDocument,
  verifyDocument,
} from "@/lib/documents/services/document-mutations";
import {
  getDocumentSettings,
  updateDocumentSettings,
} from "@/lib/documents/services/document-settings";
import { isEmployeeScoped, fromHrms, unwrapRelation } from "@/lib/documents/services/documents-utils";
import { requireServerAnyPermission, requireServerPermission } from "@/lib/permissions/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  documentSettingsSchema,
  documentUploadMetaSchema,
  generateLetterSchema,
  templateFormSchema,
} from "@/lib/validations/documents";

function revalidateDocuments(employeeId?: string) {
  revalidatePath(DOCUMENTS_ROUTES.dashboard);
  revalidatePath(DOCUMENTS_ROUTES.employeeDocuments);
  if (employeeId) {
    revalidatePath(DOCUMENTS_ROUTES.employeeDocument(employeeId));
  }
  revalidatePath(DOCUMENTS_ROUTES.letters);
  revalidatePath(DOCUMENTS_ROUTES.templates);
  revalidatePath(DOCUMENTS_ROUTES.expiring);
  revalidatePath(DOCUMENTS_ROUTES.settings);
  revalidatePath(SELF_DOCUMENTS_ROUTES.list);
}

export async function uploadDocumentAction(formData: FormData) {
  try {
    const profile = await requireServerAnyPermission([
      "documents.upload",
      "documents.edit",
      "documents.manage",
    ]);
    const supabase = await createClient();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false as const, message: "Please choose a file to upload" };
    }

    const meta = documentUploadMetaSchema.parse({
      employeeId: formData.get("employeeId"),
      documentTypeId: formData.get("documentTypeId"),
      title: formData.get("title"),
      issuedDate: formData.get("issuedDate") || null,
      expiryDate: formData.get("expiryDate") || null,
      notes: formData.get("notes") || null,
      replaceDocumentId: formData.get("replaceDocumentId") || null,
    });

    const id = await uploadAndCreateDocument(supabase, profile, meta, file);
    revalidateDocuments(meta.employeeId);
    return { success: true as const, data: id };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to upload document",
    };
  }
}

export async function archiveDocumentAction(documentId: string) {
  try {
    const profile = await requireServerAnyPermission(["documents.delete", "documents.manage"]);
    const supabase = await createClient();
    await archiveDocument(supabase, profile, documentId);
    revalidateDocuments();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to archive document",
    };
  }
}

export async function verifyDocumentAction(
  documentId: string,
  status: "verified" | "rejected",
) {
  try {
    const profile = await requireServerAnyPermission([
      "documents.edit",
      "documents.verify",
      "documents.manage",
    ]);
    const supabase = await createClient();
    await verifyDocument(supabase, profile, documentId, status);
    revalidateDocuments();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update document status",
    };
  }
}

export async function getDocumentSignedUrlAction(documentId: string) {
  try {
    const profile = await requireServerAnyPermission([
      "documents.download",
      "documents.view",
      "documents.manage",
    ]);
    const supabase = await createClient();
    const settings = await getDocumentSettings(
      supabase,
      profile.employee.organizationId,
    );
    if (
      isEmployeeScoped(profile) &&
      !settings.enableEmployeeDownloads
    ) {
      return {
        success: false as const,
        message: "Employee downloads are disabled by HR",
      };
    }

    const { data: doc, error } = await fromHrms(supabase, "employee_documents")
      .select(
        `
        id, storage_path, file_name, mime_type, title, employee_id,
        employees:employee_id!inner(organization_id)
      `,
      )
      .eq("id", documentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!doc) {
      return { success: false as const, message: "Document not found" };
    }

    const employee = unwrapRelation(doc.employees);
    if (employee?.organization_id !== profile.employee.organizationId) {
      return { success: false as const, message: "Document not found" };
    }
    if (isEmployeeScoped(profile) && doc.employee_id !== profile.employee.id) {
      return { success: false as const, message: "Document not found" };
    }

    const admin = createAdminClient();
    let url = await createSignedDocumentUrl(admin, doc.storage_path);

    if (!url && doc.storage_path.startsWith("seed/")) {
      const placeholder = [
        `Document: ${doc.title}`,
        `File: ${doc.file_name}`,
        "",
        "This is auto-generated placeholder content for seeded HRMS reference data.",
        "Replace this document with an actual upload when available.",
      ].join("\n");

      const { error: uploadError } = await admin.storage
        .from(DOCUMENTS_STORAGE_BUCKET)
        .upload(doc.storage_path, placeholder, {
          upsert: true,
          contentType: doc.mime_type || "text/plain",
        });

      if (!uploadError) {
        url = await createSignedDocumentUrl(admin, doc.storage_path);
      }
    }

    if (!url) {
      return {
        success: false as const,
        message: "File is not available in storage. Please re-upload this document.",
      };
    }

    return { success: true as const, data: url };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to create signed URL",
    };
  }
}

export async function saveTemplateAction(input: unknown, templateId?: string) {
  try {
    const profile = await requireServerAnyPermission([
      "documents.template.manage",
      "documents.manage",
    ]);
    const supabase = await createClient();
    const parsed = templateFormSchema.parse(input);
    if (templateId) {
      await updateTemplate(supabase, profile, templateId, parsed);
    } else {
      await createTemplate(supabase, profile, parsed);
    }
    revalidateDocuments();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save template",
    };
  }
}

export async function deleteTemplateAction(templateId: string) {
  try {
    const profile = await requireServerAnyPermission([
      "documents.template.manage",
      "documents.manage",
    ]);
    const supabase = await createClient();
    await deleteTemplate(supabase, profile, templateId);
    revalidateDocuments();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to delete template",
    };
  }
}

export async function generateLetterAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      "documents.generate",
      "documents.manage",
    ]);
    const supabase = await createClient();
    const parsed = generateLetterSchema.parse(input);
    const result = await generateCompanyLetter(supabase, profile, parsed);
    revalidateDocuments();
    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to generate letter",
    };
  }
}

export async function publishLetterAction(letterId: string) {
  try {
    const profile = await requireServerAnyPermission([
      "documents.generate",
      "documents.manage",
    ]);
    const supabase = await createClient();
    const documentId = await publishLetter(supabase, profile, letterId);
    revalidateDocuments();
    return { success: true as const, data: documentId };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to publish letter",
    };
  }
}

export async function deleteCompanyLetterAction(letterId: string) {
  try {
    const profile = await requireServerAnyPermission([
      "documents.generate",
      "documents.manage",
    ]);
    const supabase = await createClient();
    await deleteCompanyLetter(supabase, profile, letterId);
    revalidateDocuments();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to delete letter",
    };
  }
}

export async function saveDocumentSettingsAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      "documents.manage",
      "settings.manage",
      "documents.template.manage",
    ]);
    const supabase = await createClient();
    const parsed = documentSettingsSchema.parse(input);
    const data = await updateDocumentSettings(
      supabase,
      profile.employee.organizationId,
      profile.userId,
      parsed,
    );
    revalidatePath(DOCUMENTS_ROUTES.settings);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}

export async function getDocumentSettingsAction() {
  try {
    const profile = await requireServerPermission("documents.view");
    const supabase = await createClient();
    const data = await getDocumentSettings(supabase, profile.employee.organizationId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load settings",
    };
  }
}
