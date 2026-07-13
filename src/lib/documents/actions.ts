"use server";

import { revalidatePath } from "next/cache";

import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";
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
import { isEmployeeScoped } from "@/lib/documents/services/documents-utils";
import { requireServerAnyPermission, requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  documentSettingsSchema,
  documentUploadMetaSchema,
  generateLetterSchema,
  templateFormSchema,
} from "@/lib/validations/documents";

function revalidateDocuments() {
  revalidatePath(DOCUMENTS_ROUTES.dashboard);
  revalidatePath(DOCUMENTS_ROUTES.employeeDocuments);
  revalidatePath(DOCUMENTS_ROUTES.letters);
  revalidatePath(DOCUMENTS_ROUTES.templates);
  revalidatePath(DOCUMENTS_ROUTES.expiring);
  revalidatePath(DOCUMENTS_ROUTES.settings);
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
    revalidateDocuments();
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

export async function getDocumentSignedUrlAction(storagePath: string) {
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
    const url = await createSignedDocumentUrl(supabase, storagePath);
    if (!url) return { success: false as const, message: "Unable to create download link" };
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
