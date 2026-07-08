import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { DEFAULT_REPORTS_SETTINGS } from "@/lib/reports/constants";
import type { ReportsSettings } from "@/types/reports";
import type { ReportsSettingsFormValues } from "@/lib/validations/reports";

export function mergeReportsSettings(
  stored?: Partial<ReportsSettings> | null,
): ReportsSettings {
  const modules =
    Array.isArray(stored?.enabledModules) && stored.enabledModules.length
      ? stored.enabledModules
      : [...DEFAULT_REPORTS_SETTINGS.enabledModules];

  return {
    defaultExportFormat: stored?.defaultExportFormat ?? DEFAULT_REPORTS_SETTINGS.defaultExportFormat,
    defaultDateRangeDays:
      Number(stored?.defaultDateRangeDays) || DEFAULT_REPORTS_SETTINGS.defaultDateRangeDays,
    enabledModules: modules,
    scheduleEmailEnabled: stored?.scheduleEmailEnabled !== false,
    scheduleRetainRuns:
      Number(stored?.scheduleRetainRuns) || DEFAULT_REPORTS_SETTINGS.scheduleRetainRuns,
  };
}

export async function getReportsSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<ReportsSettings> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mergeReportsSettings((data?.settings as any)?.reports);
}

export async function updateReportsSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
  userId: string,
  values: ReportsSettingsFormValues,
): Promise<ReportsSettings> {
  const nextSettings = mergeReportsSettings(values);

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
        settings: { ...current, reports: nextSettings },
        updated_by: userId,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.schema("hrms").from("organization_settings").insert({
      organization_id: organizationId,
      settings: { reports: nextSettings },
      status: "active",
      created_by: userId,
      updated_by: userId,
    });
    if (error) throw new Error(error.message);
  }

  return nextSettings;
}
