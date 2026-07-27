import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";

export type SystemSettings = {
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  maintenanceScheduledAt: string | null;
  maintenanceAllowedUsers: string[];
  maintenanceBanner: string | null;
  emergencyShutdown: boolean;
  featureFlags: Record<string, boolean>;
  featureFlagRollouts: Record<string, { percentage: number; environment: string }>;
  environmentLabel: string;
  smtpConfigured: boolean;
  licensePlan: string | null;
  licenseExpiresAt: string | null;
  licenseKey: string | null;
  licenseEmployeeLimit: number | null;
  licenseOrgLimit: number | null;
  licenseStorageLimitGb: number | null;
  apiUsageCount: number;
};

export async function getSystemSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<SystemSettings> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("system_settings")
    .select(
      "maintenance_mode, maintenance_message, maintenance_scheduled_at, maintenance_allowed_users, maintenance_banner, emergency_shutdown, feature_flags, feature_flag_rollouts, environment_label, smtp_configured, license_plan, license_expires_at, license_key, license_employee_limit, license_org_limit, license_storage_limit_gb, api_usage_count",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    maintenanceMode: Boolean(data?.maintenance_mode),
    maintenanceMessage: (data?.maintenance_message as string | null) ?? null,
    maintenanceScheduledAt: (data?.maintenance_scheduled_at as string | null) ?? null,
    maintenanceAllowedUsers: (data?.maintenance_allowed_users as string[]) ?? [],
    maintenanceBanner: (data?.maintenance_banner as string | null) ?? null,
    emergencyShutdown: Boolean(data?.emergency_shutdown),
    featureFlags: (data?.feature_flags as Record<string, boolean>) ?? {},
    featureFlagRollouts: (data?.feature_flag_rollouts as SystemSettings["featureFlagRollouts"]) ?? {},
    environmentLabel: (data?.environment_label as string) ?? "production",
    smtpConfigured: Boolean(data?.smtp_configured),
    licensePlan: (data?.license_plan as string | null) ?? null,
    licenseExpiresAt: (data?.license_expires_at as string | null) ?? null,
    licenseKey: (data?.license_key as string | null) ?? null,
    licenseEmployeeLimit: data?.license_employee_limit ? Number(data.license_employee_limit) : null,
    licenseOrgLimit: data?.license_org_limit ? Number(data.license_org_limit) : null,
    licenseStorageLimitGb: data?.license_storage_limit_gb
      ? Number(data.license_storage_limit_gb)
      : null,
    apiUsageCount: Number(data?.api_usage_count ?? 0),
  };
}

export async function updateSystemSettings(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  organizationId: string,
  patch: Partial<{
    maintenanceMode: boolean;
    maintenanceMessage: string | null;
    maintenanceScheduledAt: string | null;
    maintenanceAllowedUsers: string[];
    maintenanceBanner: string | null;
    emergencyShutdown: boolean;
    featureFlags: Record<string, boolean>;
    featureFlagRollouts: Record<string, { percentage: number; environment: string }>;
    environmentLabel: string;
    smtpConfigured: boolean;
    licensePlan: string | null;
    licenseExpiresAt: string | null;
    licenseKey: string | null;
    licenseEmployeeLimit: number | null;
    licenseOrgLimit: number | null;
    licenseStorageLimitGb: number | null;
    apiUsageCount: number;
  }>,
) {
  const payload: Record<string, unknown> = {
    updated_by: profile.userId,
    updated_at: new Date().toISOString(),
  };

  if (patch.maintenanceMode !== undefined) payload.maintenance_mode = patch.maintenanceMode;
  if (patch.maintenanceMessage !== undefined) payload.maintenance_message = patch.maintenanceMessage;
  if (patch.maintenanceScheduledAt !== undefined)
    payload.maintenance_scheduled_at = patch.maintenanceScheduledAt;
  if (patch.maintenanceAllowedUsers !== undefined)
    payload.maintenance_allowed_users = patch.maintenanceAllowedUsers;
  if (patch.maintenanceBanner !== undefined) payload.maintenance_banner = patch.maintenanceBanner;
  if (patch.emergencyShutdown !== undefined) payload.emergency_shutdown = patch.emergencyShutdown;
  if (patch.featureFlags !== undefined) payload.feature_flags = patch.featureFlags;
  if (patch.featureFlagRollouts !== undefined) payload.feature_flag_rollouts = patch.featureFlagRollouts;
  if (patch.environmentLabel !== undefined) payload.environment_label = patch.environmentLabel;
  if (patch.smtpConfigured !== undefined) payload.smtp_configured = patch.smtpConfigured;
  if (patch.licensePlan !== undefined) payload.license_plan = patch.licensePlan;
  if (patch.licenseExpiresAt !== undefined) payload.license_expires_at = patch.licenseExpiresAt;
  if (patch.licenseKey !== undefined) payload.license_key = patch.licenseKey;
  if (patch.licenseEmployeeLimit !== undefined)
    payload.license_employee_limit = patch.licenseEmployeeLimit;
  if (patch.licenseOrgLimit !== undefined) payload.license_org_limit = patch.licenseOrgLimit;
  if (patch.licenseStorageLimitGb !== undefined)
    payload.license_storage_limit_gb = patch.licenseStorageLimitGb;
  if (patch.apiUsageCount !== undefined) payload.api_usage_count = patch.apiUsageCount;

  const { error } = await supabase
    .schema("hrms")
    .from("system_settings")
    .upsert({ organization_id: organizationId, ...payload }, { onConflict: "organization_id" });

  if (error) throw new Error(error.message);
}

export async function getLicenseSnapshot(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<{
  settings: SystemSettings;
  activeUsers: number;
  remainingSeats: number | null;
}> {
  const settings = await getSystemSettings(supabase, organizationId);
  const { count } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("account_status", "active")
    .is("deleted_at", null);

  const activeUsers = count ?? 0;
  const remainingSeats =
    settings.licenseEmployeeLimit !== null
      ? Math.max(0, settings.licenseEmployeeLimit - activeUsers)
      : null;

  return { settings, activeUsers, remainingSeats };
}
