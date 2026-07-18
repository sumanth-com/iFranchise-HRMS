import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { fromHrms } from "@/lib/documents/services/documents-utils";
import type { UserProfile } from "@/types/auth";

async function loadOwnEditableDocument(
  supabase: AuthSupabaseClient,
  employeeId: string,
  documentId: string,
) {
  const { data, error } = await fromHrms(supabase, "employee_documents")
    .select("id, employee_id, is_official, source")
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Document not found");
  if (data.employee_id !== employeeId) {
    throw new Error("You can only manage your own documents");
  }
  if (data.is_official || data.source !== "upload") {
    throw new Error("Company-issued documents are read-only");
  }
  return data;
}

/** Rename an employee's own uploaded document (company documents stay read-only). */
export async function employeeRenameDocument(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  documentId: string,
  title: string,
): Promise<void> {
  const employeeId = profile.employee.id;
  await loadOwnEditableDocument(supabase, employeeId, documentId);

  const trimmed = title.trim();
  if (!trimmed) throw new Error("Please enter a document name");

  const { error } = await fromHrms(supabase, "employee_documents")
    .update({ title: trimmed, updated_by: profile.userId })
    .eq("id", documentId)
    .eq("employee_id", employeeId);

  if (error) throw new Error(error.message);
}

/**
 * Soft-deletes an employee's own uploaded document. Previous versions remain in the
 * table (archived) so HR retains access, matching the "never permanently overwrite"
 * requirement.
 */
export async function employeeDeleteDocument(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  documentId: string,
): Promise<void> {
  const employeeId = profile.employee.id;
  await loadOwnEditableDocument(supabase, employeeId, documentId);

  const { error } = await fromHrms(supabase, "employee_documents")
    .update({ deleted_at: new Date().toISOString(), updated_by: profile.userId })
    .eq("id", documentId)
    .eq("employee_id", employeeId);

  if (error) throw new Error(error.message);
}
