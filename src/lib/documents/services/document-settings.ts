import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { DEFAULT_DOCUMENT_SETTINGS } from "@/lib/documents/constants";
import type { DocumentSettings } from "@/types/documents";
import type { DocumentSettingsFormValues } from "@/lib/validations/documents";

export const DEFAULT_DOCUMENTS_SETTINGS: DocumentSettings = {
  documentCategories: [...DEFAULT_DOCUMENT_SETTINGS.documentCategories],
  allowedFileTypes: [...DEFAULT_DOCUMENT_SETTINGS.allowedFileTypes],
  maxUploadSizeMb: DEFAULT_DOCUMENT_SETTINGS.maxUploadSizeMb,
  documentNumberPrefix: DEFAULT_DOCUMENT_SETTINGS.documentNumberPrefix,
  autoVerification: DEFAULT_DOCUMENT_SETTINGS.autoVerification,
  requireHrApprovalForLetters: DEFAULT_DOCUMENT_SETTINGS.requireHrApprovalForLetters,
  enableEmployeeDownloads: DEFAULT_DOCUMENT_SETTINGS.enableEmployeeDownloads,
  retentionPeriodDays: DEFAULT_DOCUMENT_SETTINGS.retentionPeriodDays,
};

export function mergeDocumentSettings(
  stored?: Partial<DocumentSettings> | null,
): DocumentSettings {
  const maxSize = Number(stored?.maxUploadSizeMb);
  const retention = Number(stored?.retentionPeriodDays);

  return {
    documentCategories:
      Array.isArray(stored?.documentCategories) && stored.documentCategories.length
        ? stored.documentCategories.map(String)
        : [...DEFAULT_DOCUMENTS_SETTINGS.documentCategories],
    allowedFileTypes:
      Array.isArray(stored?.allowedFileTypes) && stored.allowedFileTypes.length
        ? stored.allowedFileTypes.map((t) => String(t).toLowerCase())
        : [...DEFAULT_DOCUMENTS_SETTINGS.allowedFileTypes],
    maxUploadSizeMb:
      Number.isFinite(maxSize) && maxSize >= 1 && maxSize <= 50
        ? maxSize
        : DEFAULT_DOCUMENTS_SETTINGS.maxUploadSizeMb,
    documentNumberPrefix:
      stored?.documentNumberPrefix?.trim() ||
      DEFAULT_DOCUMENTS_SETTINGS.documentNumberPrefix,
    autoVerification: stored?.autoVerification === true,
    requireHrApprovalForLetters: stored?.requireHrApprovalForLetters !== false,
    enableEmployeeDownloads: stored?.enableEmployeeDownloads !== false,
    retentionPeriodDays:
      Number.isFinite(retention) && retention >= 30
        ? retention
        : DEFAULT_DOCUMENTS_SETTINGS.retentionPeriodDays,
  };
}

export async function getDocumentSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<DocumentSettings> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = (data?.settings as any)?.documents;
  return mergeDocumentSettings(settings);
}

export async function updateDocumentSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
  userId: string,
  values: DocumentSettingsFormValues,
): Promise<DocumentSettings> {
  const nextSettings = mergeDocumentSettings(values);

  const { data: existing, error: existingError } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("id, settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const current = (existing.settings as Record<string, unknown>) ?? {};
    const { error } = await supabase
      .schema("hrms")
      .from("organization_settings")
      .update({
        settings: { ...current, documents: nextSettings },
        updated_by: userId,
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.schema("hrms").from("organization_settings").insert({
      organization_id: organizationId,
      settings: { documents: nextSettings },
      status: "active",
      created_by: userId,
      updated_by: userId,
    });
    if (error) throw new Error(error.message);
  }

  return nextSettings;
}

export async function nextDocumentNumber(
  supabase: AuthSupabaseClient,
  organizationId: string,
  prefix: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;

  const { data, error } = await supabase
    .schema("hrms")
    .from("employee_documents")
    .select("document_number")
    .eq("organization_id", organizationId)
    .like("document_number", like)
    .order("document_number", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const last = data?.[0]?.document_number as string | undefined;
  const match = last?.match(/-(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 1;
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

export async function nextLetterNumber(
  supabase: AuthSupabaseClient,
  organizationId: string,
  letterType: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const short = letterType
    .split("_")
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const prefix = `LTR-${short || "GEN"}`;
  const like = `${prefix}-${year}-%`;

  const { data, error } = await supabase
    .schema("hrms")
    .from("document_letters")
    .select("letter_number")
    .eq("organization_id", organizationId)
    .like("letter_number", like)
    .order("letter_number", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const last = data?.[0]?.letter_number as string | undefined;
  const match = last?.match(/-(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 1;
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}
