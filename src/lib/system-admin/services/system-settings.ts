import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";

export type SystemSettings = {
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  featureFlags: Record<string, boolean>;
  environmentLabel: string;
  smtpConfigured: boolean;
  licensePlan: string | null;
  licenseExpiresAt: string | null;
};

export async function getSystemSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<SystemSettings> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("system_settings")
    .select(
      "maintenance_mode, maintenance_message, feature_flags, environment_label, smtp_configured, license_plan, license_expires_at",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    maintenanceMode: Boolean(data?.maintenance_mode),
    maintenanceMessage: (data?.maintenance_message as string | null) ?? null,
    featureFlags: (data?.feature_flags as Record<string, boolean>) ?? {},
    environmentLabel: (data?.environment_label as string) ?? "production",
    smtpConfigured: Boolean(data?.smtp_configured),
    licensePlan: (data?.license_plan as string | null) ?? null,
    licenseExpiresAt: (data?.license_expires_at as string | null) ?? null,
  };
}

export async function updateSystemSettings(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  organizationId: string,
  patch: Partial<{
    maintenanceMode: boolean;
    maintenanceMessage: string | null;
    featureFlags: Record<string, boolean>;
    environmentLabel: string;
    smtpConfigured: boolean;
    licensePlan: string | null;
    licenseExpiresAt: string | null;
  }>,
) {
  const payload: Record<string, unknown> = {
    updated_by: profile.userId,
    updated_at: new Date().toISOString(),
  };

  if (patch.maintenanceMode !== undefined) payload.maintenance_mode = patch.maintenanceMode;
  if (patch.maintenanceMessage !== undefined) payload.maintenance_message = patch.maintenanceMessage;
  if (patch.featureFlags !== undefined) payload.feature_flags = patch.featureFlags;
  if (patch.environmentLabel !== undefined) payload.environment_label = patch.environmentLabel;
  if (patch.smtpConfigured !== undefined) payload.smtp_configured = patch.smtpConfigured;
  if (patch.licensePlan !== undefined) payload.license_plan = patch.licensePlan;
  if (patch.licenseExpiresAt !== undefined) payload.license_expires_at = patch.licenseExpiresAt;

  const { error } = await supabase
    .schema("hrms")
    .from("system_settings")
    .upsert({ organization_id: organizationId, ...payload }, { onConflict: "organization_id" });

  if (error) throw new Error(error.message);
}
