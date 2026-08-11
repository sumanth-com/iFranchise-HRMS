"use server";

import { revalidatePath } from "next/cache";

import {
  COMPANY_SETTINGS_ROUTES,
  COMPANY_SETTINGS_VIEW_PERMISSIONS,
} from "@/lib/company-settings/constants";
import { canEditCompanySettings } from "@/lib/company-settings/constants";
import {
  saveBackupConfiguration,
  saveBrandingConfiguration,
  saveCompanyProfile,
  saveIntegrationsConfiguration,
  saveLeavePolicies,
  saveNotificationsGlobal,
  saveSecurityConfiguration,
  saveWorkingConfiguration,
} from "@/lib/company-settings/services/company-settings-mutations";
import { getCompanySettings } from "@/lib/company-settings/services/company-settings-queries";
import { updateOrganizationLogoPath } from "@/lib/organization/services/org-mutations";
import {
  getOrganizationLogoSignedUrl,
  removeOrganizationLogoFile,
  uploadOrganizationLogo,
} from "@/lib/organization/services/org-logo";
import { savePayrollSettings } from "@/lib/payroll/services/payroll-settings";
import { savePerformanceSettings } from "@/lib/performance/services/performance-settings";
import { updateRecruitmentSettings } from "@/lib/recruitment/services/recruitment-settings";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  backupConfigurationSchema,
  brandingConfigurationSchema,
  integrationsConfigurationSchema,
  leavePoliciesSchema,
  notificationsGlobalSchema,
  securityConfigurationSchema,
  workingConfigurationSchema,
} from "@/lib/validations/company-settings";
import { organizationProfileSchema } from "@/lib/validations/organization";
import { payrollSettingsSchema } from "@/lib/validations/payroll-settings";
import { performanceSettingsSchema } from "@/lib/validations/performance";
import { recruitmentSettingsSchema } from "@/lib/validations/recruitment";
import type { CompanySettingsActionResult } from "@/types/company-settings";

function revalidateCompanySettings() {
  revalidatePath(COMPANY_SETTINGS_ROUTES.base);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/organization");
  revalidatePath("/dashboard/organization/profile");
  revalidatePath("/employee");
  revalidatePath("/manager");
  revalidatePath("/ceo");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/attendance-management");
  revalidatePath("/dashboard/leave");
  revalidatePath("/dashboard/leave-management");
  revalidatePath("/dashboard/payroll");
  revalidatePath("/dashboard/payroll-management");
  revalidatePath("/dashboard/recruitment");
  revalidatePath("/dashboard/performance");
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/documents-management");
  revalidatePath("/dashboard/assets");
  revalidatePath("/dashboard/assets-management");
  revalidatePath("/dashboard/exit");
}

async function requireCompanySettingsView() {
  return requireServerAnyPermission([...COMPANY_SETTINGS_VIEW_PERMISSIONS]);
}

async function requireCompanySettingsEdit() {
  const profile = await requireCompanySettingsView();
  if (!canEditCompanySettings(profile)) {
    throw new Error("Only Super Admin can edit company settings");
  }
  return profile;
}

export async function saveCompanyProfileAction(
  input: unknown,
): Promise<CompanySettingsActionResult> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const parsed = organizationProfileSchema.parse(input);
    await saveCompanyProfile(supabase, profile, parsed);
    revalidateCompanySettings();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save company profile",
    };
  }
}

export async function uploadCompanyLogoAction(
  formData: FormData,
): Promise<CompanySettingsActionResult<{ logoUrl: string | null }>> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return { success: false, message: "Please choose an image file" };
    }

    const organizationId = profile.employee.organizationId;
    const storagePath = await uploadOrganizationLogo(supabase, organizationId, file);
    await updateOrganizationLogoPath(supabase, profile, storagePath);

    const logoUrl = await getOrganizationLogoSignedUrl(supabase, storagePath);
    revalidateCompanySettings();
    return { success: true, data: { logoUrl } };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload company logo",
    };
  }
}

export async function removeCompanyLogoAction(): Promise<CompanySettingsActionResult> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const organizationId = profile.employee.organizationId;

    const { data: orgRow, error: fetchError } = await supabase
      .schema("hrms")
      .from("organizations")
      .select("logo_storage_path")
      .eq("id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);

    const currentPath = orgRow?.logo_storage_path;
    if (currentPath) {
      try {
        await removeOrganizationLogoFile(supabase, currentPath);
      } catch {
        // Ignore storage cleanup errors; DB path is still cleared.
      }
    }

    await updateOrganizationLogoPath(supabase, profile, null);
    revalidateCompanySettings();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to remove company logo",
    };
  }
}

export async function saveWorkingConfigurationAction(
  input: unknown,
): Promise<CompanySettingsActionResult> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const parsed = workingConfigurationSchema.parse(input);
    await saveWorkingConfiguration(supabase, profile, parsed);
    revalidateCompanySettings();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save working configuration",
    };
  }
}

export async function saveLeavePoliciesAction(
  input: unknown,
): Promise<CompanySettingsActionResult> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const parsed = leavePoliciesSchema.parse(input);
    await saveLeavePolicies(supabase, profile, parsed);
    revalidateCompanySettings();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save leave policies",
    };
  }
}

export async function saveCompanyPayrollSettingsAction(
  input: unknown,
): Promise<CompanySettingsActionResult> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const parsed = payrollSettingsSchema.parse(input);
    await savePayrollSettings(supabase, profile, parsed);
    revalidateCompanySettings();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save payroll configuration",
    };
  }
}

export async function saveCompanyRecruitmentSettingsAction(
  input: unknown,
): Promise<CompanySettingsActionResult> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const parsed = recruitmentSettingsSchema.parse(input);
    await updateRecruitmentSettings(
      supabase,
      profile.employee.organizationId,
      parsed,
    );
    revalidateCompanySettings();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save recruitment configuration",
    };
  }
}

export async function saveCompanyPerformanceSettingsAction(
  input: unknown,
): Promise<CompanySettingsActionResult> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const parsed = performanceSettingsSchema.parse(input);
    await savePerformanceSettings(supabase, profile, parsed);
    revalidateCompanySettings();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save performance configuration",
    };
  }
}

export async function saveNotificationsGlobalAction(
  input: unknown,
): Promise<CompanySettingsActionResult> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const parsed = notificationsGlobalSchema.parse(input);
    await saveNotificationsGlobal(supabase, profile, parsed);
    revalidateCompanySettings();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save notification configuration",
    };
  }
}

export async function saveSecurityConfigurationAction(
  input: unknown,
): Promise<CompanySettingsActionResult> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const parsed = securityConfigurationSchema.parse(input);
    await saveSecurityConfiguration(supabase, profile, parsed);
    revalidateCompanySettings();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save security settings",
    };
  }
}

export async function saveBrandingConfigurationAction(
  input: unknown,
): Promise<CompanySettingsActionResult> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const parsed = brandingConfigurationSchema.parse(input);
    await saveBrandingConfiguration(supabase, profile, parsed);
    revalidateCompanySettings();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save branding settings",
    };
  }
}

export async function saveIntegrationsConfigurationAction(
  input: unknown,
): Promise<CompanySettingsActionResult> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const parsed = integrationsConfigurationSchema.parse(input);
    await saveIntegrationsConfiguration(supabase, profile, parsed);
    revalidateCompanySettings();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save integrations",
    };
  }
}

export async function saveBackupConfigurationAction(
  input: unknown,
): Promise<CompanySettingsActionResult> {
  try {
    const profile = await requireCompanySettingsEdit();
    const supabase = await createClient();
    const parsed = backupConfigurationSchema.parse(input);
    await saveBackupConfiguration(supabase, profile, parsed);
    revalidateCompanySettings();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save backup settings",
    };
  }
}

export async function getCompanySettingsAction(): Promise<
  CompanySettingsActionResult<Awaited<ReturnType<typeof getCompanySettings>>>
> {
  try {
    const profile = await requireServerPermission("settings.view");
    const supabase = await createClient();
    const data = await getCompanySettings(supabase, profile.employee.organizationId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load company settings",
    };
  }
}
