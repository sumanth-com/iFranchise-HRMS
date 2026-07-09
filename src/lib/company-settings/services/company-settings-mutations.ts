import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  BackupConfiguration,
  BrandingConfiguration,
  IntegrationsConfiguration,
  LeavePoliciesConfiguration,
  NotificationsGlobalConfiguration,
  SecurityConfiguration,
  WorkingConfiguration,
} from "@/types/company-settings";
import {
  toStoredBackupConfiguration,
  toStoredBrandingConfiguration,
  toStoredIntegrationsConfiguration,
  toStoredLeavePolicies,
  toStoredNotificationsGlobal,
  toStoredSecurityConfiguration,
  toStoredWorkingConfiguration,
} from "@/lib/company-settings/services/company-settings-parsers";
import { updateOrganizationProfile } from "@/lib/organization/services/org-mutations";
import type { z } from "zod";
import type { organizationProfileSchema } from "@/lib/validations/organization";

type ProfileInput = z.infer<typeof organizationProfileSchema>;

async function mergeOrganizationSettings(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  merge: (current: Record<string, unknown>) => Record<string, unknown>,
  columnUpdates?: Record<string, unknown>,
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
    ...columnUpdates,
  };

  if (existing?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("organization_settings")
      .update(rowPayload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.schema("hrms").from("organization_settings").insert({
      organization_id: organizationId,
      ...rowPayload,
      created_by: profile.userId,
    });
    if (error) throw new Error(error.message);
  }
}

export async function saveCompanyProfile(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ProfileInput,
) {
  await updateOrganizationProfile(supabase, profile, input);
}

export async function saveWorkingConfiguration(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  working: WorkingConfiguration,
) {
  const stored = toStoredWorkingConfiguration(working);
  await mergeOrganizationSettings(supabase, profile, (current) => ({
    ...current,
    ...stored,
  }), {
    work_week_start_day: working.workWeekStartDay,
    timezone: working.officeHours.timezone,
  });
}

export async function saveLeavePolicies(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leave: LeavePoliciesConfiguration,
) {
  const stored = toStoredLeavePolicies(leave);
  await mergeOrganizationSettings(supabase, profile, (current) => ({
    ...current,
    ...stored,
  }));
}

export async function saveNotificationsGlobal(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  notifications: NotificationsGlobalConfiguration,
) {
  await mergeOrganizationSettings(supabase, profile, (current) => ({
    ...current,
    notifications_global: toStoredNotificationsGlobal(notifications),
  }));
}

export async function saveSecurityConfiguration(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  security: SecurityConfiguration,
) {
  await mergeOrganizationSettings(supabase, profile, (current) => ({
    ...current,
    security: toStoredSecurityConfiguration(security),
  }));
}

export async function saveBrandingConfiguration(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  branding: BrandingConfiguration,
) {
  await mergeOrganizationSettings(supabase, profile, (current) => ({
    ...current,
    branding: toStoredBrandingConfiguration(branding),
  }));
}

export async function saveIntegrationsConfiguration(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  integrations: IntegrationsConfiguration,
) {
  await mergeOrganizationSettings(supabase, profile, (current) => ({
    ...current,
    integrations: toStoredIntegrationsConfiguration(integrations),
  }));
}

export async function saveBackupConfiguration(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  backup: BackupConfiguration,
) {
  await mergeOrganizationSettings(supabase, profile, (current) => ({
    ...current,
    backup: toStoredBackupConfiguration(backup),
  }));

  const { data: auditSettings } = await supabase
    .schema("hrms")
    .from("audit_settings")
    .select("id")
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (auditSettings?.id) {
    await supabase
      .schema("hrms")
      .from("audit_settings")
      .update({
        retention_days: backup.logRetentionDays,
        updated_by: profile.userId,
      })
      .eq("id", auditSettings.id);
  }
}
