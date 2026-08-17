import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  DEFAULT_API_CONFIG,
  type ApiRateLimitTier,
} from "@/lib/public-api/constants";

export type SystemApiConfig = {
  enabled: boolean;
  currentVersion: string;
  defaultRateLimitPerMinute: number;
  allowedEnvironments: Array<"production" | "sandbox">;
  webhooksEnabled: boolean;
};

function parseConfig(raw: unknown): SystemApiConfig {
  const value = (raw ?? {}) as Record<string, unknown>;
  const environments = Array.isArray(value.allowedEnvironments)
    ? value.allowedEnvironments.filter(
        (item): item is "production" | "sandbox" =>
          item === "production" || item === "sandbox",
      )
    : [...DEFAULT_API_CONFIG.allowedEnvironments];

  return {
    enabled: value.enabled !== false,
    currentVersion:
      typeof value.currentVersion === "string" && value.currentVersion.trim()
        ? value.currentVersion
        : DEFAULT_API_CONFIG.currentVersion,
    defaultRateLimitPerMinute:
      typeof value.defaultRateLimitPerMinute === "number" &&
      value.defaultRateLimitPerMinute > 0
        ? Math.min(value.defaultRateLimitPerMinute, 5000)
        : DEFAULT_API_CONFIG.defaultRateLimitPerMinute,
    allowedEnvironments:
      environments.length > 0
        ? environments
        : [...DEFAULT_API_CONFIG.allowedEnvironments],
    webhooksEnabled: value.webhooksEnabled !== false,
  };
}

export async function getSystemApiConfig(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<SystemApiConfig> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("system_settings")
    .select("api_config")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return parseConfig(data?.api_config);
}

export async function updateSystemApiConfig(
  supabase: AuthSupabaseClient,
  organizationId: string,
  userId: string,
  patch: Partial<SystemApiConfig>,
): Promise<SystemApiConfig> {
  const current = await getSystemApiConfig(supabase, organizationId);
  const next: SystemApiConfig = {
    ...current,
    ...patch,
    allowedEnvironments: patch.allowedEnvironments ?? current.allowedEnvironments,
  };

  const { error } = await supabase
    .schema("hrms")
    .from("system_settings")
    .upsert(
      {
        organization_id: organizationId,
        api_config: next,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );

  if (error) throw new Error(error.message);
  return next;
}

export function resolveKeyRateLimit(
  tier: ApiRateLimitTier | string,
  customPerMinute: number | null | undefined,
  orgDefault: number,
): number {
  if (tier === "custom" && customPerMinute && customPerMinute > 0) {
    return Math.min(customPerMinute, 5000);
  }
  if (tier === "high_volume") return 300;
  if (tier === "standard") return orgDefault || 60;
  return orgDefault || 60;
}
