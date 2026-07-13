import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import {
  DOCUMENTS_STORAGE_BUCKET,
  LETTER_TYPE_OPTIONS,
} from "@/lib/documents/constants";
import {
  getDocumentSettings,
  nextDocumentNumber,
  nextLetterNumber,
} from "@/lib/documents/services/document-settings";
import { getDocumentTypeIdByCode, getTemplateById } from "@/lib/documents/services/document-queries";
import { applyPlaceholders, generateLetterPdfBytes } from "@/lib/documents/services/letter-pdf";
import { buildLetterPlaceholders } from "@/lib/documents/services/letter-placeholders";
import {
  emptyToNull,
  fromHrms,
  isEmployeeScoped,
} from "@/lib/documents/services/documents-utils";
import type {
  DocumentUploadMeta,
  GenerateLetterValues,
  TemplateFormValues,
} from "@/lib/validations/documents";
import type { LetterType } from "@/types/documents";

function assertCanMutateEmployee(profile: UserProfile, employeeId: string) {
  if (isEmployeeScoped(profile) && profile.employee.id !== employeeId) {
    throw new Error("You can only manage your own documents");
  }
}

export async function uploadAndCreateDocument(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  meta: DocumentUploadMeta,
  file: File,
): Promise<string> {
  assertCanMutateEmployee(profile, meta.employeeId);

  if (meta.replaceDocumentId) {
    const { data: existing, error: existingError } = await fromHrms(supabase, "employee_documents")
      .select("id, is_official, employee_id")
      .eq("id", meta.replaceDocumentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (!existing) throw new Error("Document to replace was not found");
    if (existing.employee_id !== meta.employeeId) {
      throw new Error("Replace target does not belong to the selected employee");
    }
    if (existing.is_official && isEmployeeScoped(profile)) {
      throw new Error("Official HR letters cannot be replaced by employees");
    }
  }

  const settings = await getDocumentSettings(supabase, profile.employee.organizationId);
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!settings.allowedFileTypes.includes(ext)) {
    throw new Error(`File type .${ext} is not allowed`);
  }
  const maxBytes = settings.maxUploadSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File exceeds maximum size of ${settings.maxUploadSizeMb} MB`);
  }

  const organizationId = profile.employee.organizationId;
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${organizationId}/${meta.employeeId}/${crypto.randomUUID()}-${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) throw new Error(uploadError.message);

  const documentNumber = await nextDocumentNumber(
    supabase,
    organizationId,
    settings.documentNumberPrefix,
  );

  const documentStatus = settings.autoVerification ? "verified" : "pending";

  const { data, error } = await fromHrms(supabase, "employee_documents")
    .insert({
      organization_id: organizationId,
      employee_id: meta.employeeId,
      document_type_id: meta.documentTypeId,
      title: meta.title,
      document_number: documentNumber,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      file_size_bytes: file.size,
      document_status: documentStatus,
      source: "upload",
      is_official: false,
      issued_date: emptyToNull(meta.issuedDate),
      expiry_date: emptyToNull(meta.expiryDate),
      notes: emptyToNull(meta.notes),
      verified_at: settings.autoVerification ? new Date().toISOString() : null,
      verified_by: settings.autoVerification ? profile.userId : null,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    await supabase.storage.from(DOCUMENTS_STORAGE_BUCKET).remove([storagePath]);
    throw new Error(error?.message ?? "Failed to save document");
  }

  if (meta.replaceDocumentId) {
    await fromHrms(supabase, "employee_documents")
      .update({
        archived_at: new Date().toISOString(),
        replaced_by_id: data.id,
        updated_by: profile.userId,
      })
      .eq("id", meta.replaceDocumentId)
      .eq("employee_id", meta.employeeId);
  }

  return data.id;
}

export async function archiveDocument(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  documentId: string,
): Promise<void> {
  if (isEmployeeScoped(profile)) {
    throw new Error("Employees cannot archive documents");
  }

  const { data, error } = await fromHrms(supabase, "employee_documents")
    .select("id, employees!inner(organization_id)")
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Document not found");

  const { error: updateError } = await fromHrms(supabase, "employee_documents")
    .update({
      archived_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", documentId);

  if (updateError) throw new Error(updateError.message);
}

export async function verifyDocument(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  documentId: string,
  status: "verified" | "rejected",
): Promise<void> {
  if (isEmployeeScoped(profile)) {
    throw new Error("Employees cannot verify documents");
  }

  const { error } = await fromHrms(supabase, "employee_documents")
    .update({
      document_status: status,
      verified_at: new Date().toISOString(),
      verified_by: profile.userId,
      updated_by: profile.userId,
    })
    .eq("id", documentId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function createTemplate(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: TemplateFormValues,
): Promise<string> {
  const organizationId = profile.employee.organizationId;

  if (input.isDefault) {
    await fromHrms(supabase, "document_templates")
      .update({ is_default: false, updated_by: profile.userId })
      .eq("organization_id", organizationId)
      .eq("letter_type", input.letterType)
      .eq("is_default", true)
      .is("deleted_at", null);
  }

  const { data, error } = await fromHrms(supabase, "document_templates")
    .insert({
      organization_id: organizationId,
      name: input.name,
      letter_type: input.letterType,
      document_type_code: input.documentTypeCode,
      subject: emptyToNull(input.subject),
      body_html: input.bodyHtml,
      is_default: input.isDefault,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create template");
  return data.id;
}

export async function updateTemplate(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  templateId: string,
  input: TemplateFormValues,
): Promise<void> {
  const organizationId = profile.employee.organizationId;

  if (input.isDefault) {
    await fromHrms(supabase, "document_templates")
      .update({ is_default: false, updated_by: profile.userId })
      .eq("organization_id", organizationId)
      .eq("letter_type", input.letterType)
      .eq("is_default", true)
      .neq("id", templateId)
      .is("deleted_at", null);
  }

  const { error } = await fromHrms(supabase, "document_templates")
    .update({
      name: input.name,
      letter_type: input.letterType,
      document_type_code: input.documentTypeCode,
      subject: emptyToNull(input.subject),
      body_html: input.bodyHtml,
      is_default: input.isDefault,
      updated_by: profile.userId,
    })
    .eq("id", templateId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function deleteTemplate(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  templateId: string,
): Promise<void> {
  const { error } = await fromHrms(supabase, "document_templates")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", templateId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

export async function generateCompanyLetter(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: GenerateLetterValues & {
    sourceModule?: string;
    sourceRecordId?: string;
  },
): Promise<{ letterId: string; documentId: string | null }> {
  if (isEmployeeScoped(profile)) {
    throw new Error("Employees cannot generate company letters");
  }

  const organizationId = profile.employee.organizationId;
  const settings = await getDocumentSettings(supabase, organizationId);
  const letterMeta = LETTER_TYPE_OPTIONS.find((o) => o.value === input.letterType);
  if (!letterMeta) throw new Error("Invalid letter type");

  let templateBody = input.bodyHtml;
  let templateSubject = input.subject ?? null;
  let templateId = input.templateId ?? null;

  if (!templateBody || templateId) {
    let template = templateId
      ? await getTemplateById(supabase, profile, templateId)
      : null;

    if (!template) {
      const { data: defaultTemplate, error } = await fromHrms(supabase, "document_templates")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("letter_type", input.letterType)
        .eq("is_default", true)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (defaultTemplate) {
        template = {
          id: defaultTemplate.id,
          name: defaultTemplate.name,
          letterType: defaultTemplate.letter_type,
          documentTypeCode: defaultTemplate.document_type_code,
          subject: defaultTemplate.subject,
          bodyHtml: defaultTemplate.body_html,
          isDefault: true,
          updatedAt: defaultTemplate.updated_at,
        };
      }
    }

    if (!template && !templateBody) {
      throw new Error("No template found for this letter type");
    }

    if (template) {
      templateId = template.id;
      templateBody = templateBody || template.bodyHtml;
      templateSubject = templateSubject ?? template.subject;
    }
  }

  const placeholders = await buildLetterPlaceholders(
    supabase,
    profile,
    input.employeeId,
    input.salaryOverride,
  );

  const renderedBody = applyPlaceholders(templateBody!, placeholders);
  const renderedSubject = templateSubject
    ? applyPlaceholders(templateSubject, placeholders)
    : letterMeta.label;

  const letterNumber = await nextLetterNumber(supabase, organizationId, input.letterType);
  const requiresApproval = settings.requireHrApprovalForLetters && !input.publishNow;
  const letterStatus = requiresApproval ? "pending_approval" : "published";

  const { data: letter, error: letterError } = await fromHrms(supabase, "document_letters")
    .insert({
      organization_id: organizationId,
      employee_id: input.employeeId,
      template_id: templateId,
      letter_type: input.letterType,
      letter_number: letterNumber,
      subject: renderedSubject,
      body_html: renderedBody,
      placeholders,
      letter_status: letterStatus,
      generated_at: new Date().toISOString(),
      published_at: letterStatus === "published" ? new Date().toISOString() : null,
      published_by: letterStatus === "published" ? profile.userId : null,
      source_module: input.sourceModule ?? "documents",
      source_record_id: input.sourceRecordId ?? null,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (letterError || !letter) {
    throw new Error(letterError?.message ?? "Failed to create letter");
  }

  let documentId: string | null = null;

  if (letterStatus === "published") {
    documentId = await storeLetterAsEmployeeDocument(supabase, profile, {
      letterId: letter.id,
      employeeId: input.employeeId,
      letterType: input.letterType,
      letterNumber,
      subject: renderedSubject,
      bodyHtml: renderedBody,
      companyName: placeholders.companyName,
      documentTypeCode: letterMeta.documentTypeCode,
    });
  }

  return { letterId: letter.id, documentId };
}

async function storeLetterAsEmployeeDocument(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    letterId: string;
    employeeId: string;
    letterType: LetterType;
    letterNumber: string;
    subject: string;
    bodyHtml: string;
    companyName: string;
    documentTypeCode: string;
  },
): Promise<string> {
  const organizationId = profile.employee.organizationId;
  const settings = await getDocumentSettings(supabase, organizationId);
  const documentTypeId = await getDocumentTypeIdByCode(
    supabase,
    organizationId,
    input.documentTypeCode,
  );

  if (!documentTypeId) {
    throw new Error(`Document type ${input.documentTypeCode} is missing`);
  }

  const pdfBytes = await generateLetterPdfBytes({
    companyName: input.companyName,
    subject: input.subject,
    letterNumber: input.letterNumber,
    bodyHtml: input.bodyHtml,
  });

  const fileName = `${input.letterNumber}.pdf`;
  const storagePath = `${organizationId}/${input.employeeId}/letters/${crypto.randomUUID()}-${fileName}`;

  const pdfBlob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_STORAGE_BUCKET)
    .upload(storagePath, pdfBlob, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf",
    });

  if (uploadError) throw new Error(uploadError.message);

  const documentNumber = await nextDocumentNumber(
    supabase,
    organizationId,
    settings.documentNumberPrefix,
  );

  const { data: doc, error: docError } = await fromHrms(supabase, "employee_documents")
    .insert({
      organization_id: organizationId,
      employee_id: input.employeeId,
      document_type_id: documentTypeId,
      title: input.subject || input.letterNumber,
      document_number: documentNumber,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: "application/pdf",
      file_size_bytes: pdfBytes.byteLength,
      document_status: "verified",
      source: "generated",
      is_official: true,
      issued_date: new Date().toISOString().slice(0, 10),
      verified_at: new Date().toISOString(),
      verified_by: profile.userId,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (docError || !doc) {
    await supabase.storage.from(DOCUMENTS_STORAGE_BUCKET).remove([storagePath]);
    throw new Error(docError?.message ?? "Failed to store letter PDF");
  }

  await fromHrms(supabase, "document_letters")
    .update({
      employee_document_id: doc.id,
      updated_by: profile.userId,
    })
    .eq("id", input.letterId);

  return doc.id;
}

export async function publishLetter(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  letterId: string,
): Promise<string> {
  if (isEmployeeScoped(profile)) {
    throw new Error("Employees cannot publish letters");
  }

  const { data: letter, error } = await fromHrms(supabase, "document_letters")
    .select("*")
    .eq("id", letterId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!letter) throw new Error("Letter not found");
  if (letter.letter_status === "published" && letter.employee_document_id) {
    return letter.employee_document_id;
  }

  const letterMeta = LETTER_TYPE_OPTIONS.find((o) => o.value === letter.letter_type);
  if (!letterMeta) throw new Error("Invalid letter type");

  const placeholders = letter.placeholders as { companyName?: string };
  const documentId = await storeLetterAsEmployeeDocument(supabase, profile, {
    letterId: letter.id,
    employeeId: letter.employee_id,
    letterType: letter.letter_type,
    letterNumber: letter.letter_number,
    subject: letter.subject,
    bodyHtml: letter.body_html,
    companyName: placeholders?.companyName ?? "iFranchise",
    documentTypeCode: letterMeta.documentTypeCode,
  });

  await fromHrms(supabase, "document_letters")
    .update({
      letter_status: "published",
      published_at: new Date().toISOString(),
      published_by: profile.userId,
      employee_document_id: documentId,
      updated_by: profile.userId,
    })
    .eq("id", letterId);

  return documentId;
}

export async function deleteCompanyLetter(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  letterId: string,
): Promise<void> {
  if (isEmployeeScoped(profile)) {
    throw new Error("Employees cannot delete company letters");
  }

  const organizationId = profile.employee.organizationId;
  const { data: letter, error } = await fromHrms(supabase, "document_letters")
    .select("id")
    .eq("id", letterId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!letter) throw new Error("Letter not found");

  const { error: updateError } = await fromHrms(supabase, "document_letters")
    .update({
      letter_status: "archived",
      updated_by: profile.userId,
    })
    .eq("id", letterId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (updateError) throw new Error(updateError.message);
}

export async function createSignedDocumentUrl(
  supabase: AuthSupabaseClient,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Workflow helpers used by Recruitment / Payroll / Performance */
export async function autoGenerateLetterForEmployee(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    employeeId: string;
    letterType: LetterType;
    salaryOverride?: string | null;
    sourceModule: string;
    sourceRecordId?: string;
    publishNow?: boolean;
  },
): Promise<string | null> {
  try {
    const result = await generateCompanyLetter(supabase, profile, {
      employeeId: input.employeeId,
      letterType: input.letterType,
      templateId: null,
      subject: null,
      salaryOverride: input.salaryOverride ?? null,
      publishNow: input.publishNow ?? true,
      sourceModule: input.sourceModule,
      sourceRecordId: input.sourceRecordId,
    });
    return result.letterId;
  } catch (error) {
    console.error("Auto letter generation failed:", error);
    return null;
  }
}
