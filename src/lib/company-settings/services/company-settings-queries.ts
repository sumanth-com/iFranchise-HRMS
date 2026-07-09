import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { CompanySettingsBundle } from "@/types/company-settings";
import {
  parseBackupConfiguration,
  parseBrandingConfiguration,
  parseIntegrationsConfiguration,
  parseLeavePolicies,
  parseNotificationsGlobal,
  parseSecurityConfiguration,
  parseWorkingConfiguration,
} from "@/lib/company-settings/services/company-settings-parsers";
import { getOrganizationProfile } from "@/lib/organization/services/org-queries";
import { getPayrollSettings } from "@/lib/payroll/services/payroll-settings";
import { getPerformanceSettings } from "@/lib/performance/services/performance-settings";
import { getRecruitmentLookups } from "@/lib/recruitment/services/recruitment-queries";
import { getRecruitmentSettings } from "@/lib/recruitment/services/recruitment-settings";

export async function getCompanySettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<CompanySettingsBundle> {
  const [
    profile,
    orgSettingsRow,
    payroll,
    recruitment,
    performance,
    lookups,
    shiftTemplates,
  ] = await Promise.all([
    getOrganizationProfile(supabase, organizationId),
    supabase
      .schema("hrms")
      .from("organization_settings")
      .select("settings, work_week_start_day, timezone")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle(),
    getPayrollSettings(supabase, organizationId),
    getRecruitmentSettings(supabase, organizationId),
    getPerformanceSettings(supabase, organizationId),
    getRecruitmentLookups(supabase, organizationId),
    supabase
      .schema("hrms")
      .from("shift_templates")
      .select("id, name, code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .eq("status", "active")
      .order("name"),
  ]);

  if (!profile) {
    throw new Error("Organization not found");
  }

  if (orgSettingsRow.error) {
    throw new Error(orgSettingsRow.error.message);
  }

  const settings =
    (orgSettingsRow.data?.settings as Record<string, unknown> | null) ?? {};

  return {
    profile,
    working: parseWorkingConfiguration(settings, {
      workWeekStartDay: orgSettingsRow.data?.work_week_start_day,
      timezone: orgSettingsRow.data?.timezone,
    }),
    leave: parseLeavePolicies(settings),
    payroll,
    recruitment,
    performance,
    notifications: parseNotificationsGlobal(settings),
    security: parseSecurityConfiguration(settings),
    branding: parseBrandingConfiguration(settings),
    integrations: parseIntegrationsConfiguration(settings),
    backup: parseBackupConfiguration(settings),
    shiftTemplates: (shiftTemplates.data ?? []).map((row) => ({
      id: row.id,
      label: row.code ? `${row.name} (${row.code})` : row.name,
    })),
    recruitmentManagers: lookups.employees,
  };
}
