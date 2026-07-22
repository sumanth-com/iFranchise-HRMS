import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { LeavePolicyDocument } from "@/types/leave-policy";

async function mergeOrganizationSettings(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  merge: (current: Record<string, unknown>) => Record<string, unknown>,
) {
  const organizationId = profile.employee.organizationId;

  const { data: existing, error: fetchError } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("id, settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  const currentSettings = (existing?.settings as Record<string, unknown> | null) ?? {};
  const nextSettings = merge(currentSettings);

  const rowPayload = {
    settings: nextSettings,
    updated_by: profile.userId,
  };

  if (existing?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("organization_settings")
      .update(rowPayload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.schema("hrms").from("organization_settings").insert({
    organization_id: organizationId,
    ...rowPayload,
    created_by: profile.userId,
  });
  if (error) throw new Error(error.message);
}

export async function saveLeavePolicyDocument(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  document: Omit<LeavePolicyDocument, "updatedAt">,
) {
  const stored: LeavePolicyDocument = {
    ...document,
    updatedAt: new Date().toISOString(),
  };

  await mergeOrganizationSettings(supabase, profile, (current) => ({
    ...current,
    leave_policy_document: stored,
  }));
}
