import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { isSuperAdmin } from "@/lib/audit/constants";
import type { AuditSettingsFormInput } from "@/lib/validations/audit";

export async function saveAuditSettings(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: AuditSettingsFormInput,
): Promise<void> {
  if (!isSuperAdmin(profile)) {
    throw new Error("Only Super Admin can update audit retention settings");
  }

  const organizationId = profile.employee.organizationId;

  const { data: existing } = await supabase
    .schema("hrms")
    .from("audit_settings")
    .select("id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("audit_settings")
      .update({
        retention_days: input.retentionDays,
        updated_by: profile.userId,
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.schema("hrms").from("audit_settings").insert({
      organization_id: organizationId,
      retention_days: input.retentionDays,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    });

    if (error) throw new Error(error.message);
  }

  await archiveExpiredAuditLogs(supabase, profile, input.retentionDays);
}

export async function archiveExpiredAuditLogs(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  retentionDays: number,
): Promise<number> {
  if (!isSuperAdmin(profile)) return 0;

  const { data, error } = await supabase.schema("hrms").rpc("archive_expired_audit_logs", {
    p_organization_id: profile.employee.organizationId,
    p_retention_days: retentionDays,
  });

  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 0;
}
