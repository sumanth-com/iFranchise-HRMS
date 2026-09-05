import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { resolveDocumentsBucket } from "@/lib/documents/storage-paths";
import { fromHrms } from "@/lib/documents/services/documents-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import type { UserProfile } from "@/types/auth";

async function loadOwnEditableDocument(
  supabase: AuthSupabaseClient,
  employeeId: string,
  documentId: string,
) {
  const { data, error } = await fromHrms(supabase, "employee_documents")
    .select("id, employee_id, is_official, source, storage_path")
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
 *
 * Uses a SECURITY DEFINER RPC (or service-role fallback) so PostgREST RETURNING
 * does not fail SELECT RLS after `deleted_at` is set.
 */
export async function employeeDeleteDocument(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  documentId: string,
): Promise<void> {
  const employeeId = profile.employee.id;
  const existing = await loadOwnEditableDocument(supabase, employeeId, documentId);
  const storagePath = String(existing.storage_path ?? "");

  // Prefer service-role soft delete so PostgREST RETURNING does not hit SELECT RLS
  // after deleted_at is set ("new row violates row-level security policy").
  if (hasSupabaseServiceRoleEnv()) {
    const admin = createAdminClient() as unknown as AuthSupabaseClient;
    const { error } = await fromHrms(admin, "employee_documents")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: profile.userId,
      })
      .eq("id", documentId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
  } else {
    const { error: rpcError } = await supabase.schema("hrms").rpc(
      "soft_delete_own_employee_document",
      { p_document_id: documentId },
    );

    if (rpcError) {
      throw new Error(
        rpcError.message.includes("Could not find the function")
          ? "Document delete is not configured yet. Please apply the latest database migration."
          : rpcError.message,
      );
    }
  }

  // Best-effort storage cleanup after DB soft-delete (listing is DB-backed).
  if (storagePath && hasSupabaseServiceRoleEnv()) {
    try {
      const admin = createAdminClient();
      await admin.storage.from(resolveDocumentsBucket(storagePath)).remove([storagePath]);
    } catch {
      // Keep delete successful even if the object is already gone.
    }
  }
}
