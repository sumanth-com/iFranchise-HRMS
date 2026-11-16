import "server-only";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { EXPLORER_DOCUMENT_TYPE_SEED } from "@/lib/employee/documents/categories";
import { fromHrms } from "@/lib/documents/services/documents-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";

/**
 * Ensures explorer slot document types exist for the organization.
 * Safe to call on every explorer load — only inserts missing codes.
 */
export async function ensureExplorerDocumentTypes(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<void> {
  const { data: existing, error } = await fromHrms(supabase, "document_types")
    .select("code, name, description")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) {
    console.error("[documents] failed to list document types", error.message);
    return;
  }

  const have = new Set(
    (existing ?? []).map((row: { code?: string | null }) => String(row.code ?? "").toUpperCase()),
  );

  // Keep metadata current without treating a page read as a metadata edit.
  const changedNames = EXPLORER_DOCUMENT_TYPE_SEED.filter((seed) =>
    (existing ?? []).some((row: { code?: string | null; name?: string | null; description?: string | null }) => row.code === seed.code &&
      (row.name !== seed.name || row.description !== seed.description)),
  );
  const missing = EXPLORER_DOCUMENT_TYPE_SEED.filter((seed) => !have.has(seed.code));
  if (missing.length === 0) {
    // Still refresh display names for certification slots when present.
    await refreshExplorerTypeNames(supabase, organizationId, changedNames);
    return;
  }

  const writer = hasSupabaseServiceRoleEnv()
    ? (createAdminClient() as unknown as AuthSupabaseClient)
    : supabase;

  const { error: insertError } = await fromHrms(writer, "document_types").insert(
    missing.map((seed) => ({
      organization_id: organizationId,
      name: seed.name,
      code: seed.code,
      description: seed.description,
      is_required: seed.isRequired,
      requires_expiry: false,
      status: "active",
    })),
  );

  if (insertError) {
    console.error("[documents] failed to seed explorer document types", insertError.message);
  }

  await refreshExplorerTypeNames(writer, organizationId, changedNames);
}

async function refreshExplorerTypeNames(
  supabase: AuthSupabaseClient,
  organizationId: string,
  seeds: typeof EXPLORER_DOCUMENT_TYPE_SEED,
) {
  for (const seed of seeds) {
    await fromHrms(supabase, "document_types")
      .update({
        name: seed.name,
        description: seed.description,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("code", seed.code)
      .is("deleted_at", null);
  }
}
