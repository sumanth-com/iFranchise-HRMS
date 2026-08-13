import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { isSuperAdmin } from "@/lib/audit/constants";
import { createAdminClient } from "@/lib/supabase/admin";
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

/** Soft-delete a single audit log entry. Super Admin only (bypasses RLS via admin client). */
export async function softDeleteAuditLog(
  profile: UserProfile,
  auditLogId: string,
): Promise<void> {
  const deleted = await softDeleteAuditLogs(profile, [auditLogId]);
  if (deleted === 0) throw new Error("Audit log not found or already removed");
}

/** Soft-delete multiple audit log entries. Super Admin only. */
export async function softDeleteAuditLogs(
  profile: UserProfile,
  auditLogIds: string[],
): Promise<number> {
  if (!isSuperAdmin(profile)) {
    throw new Error("Only Super Admin can delete audit log entries");
  }

  const ids = [...new Set(auditLogIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return 0;
  if (ids.length > 100) {
    throw new Error("You can delete at most 100 audit entries at once");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .schema("hrms")
    .from("audit_logs")
    .update({
      deleted_at: now,
      updated_at: now,
    })
    .in("id", ids)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
