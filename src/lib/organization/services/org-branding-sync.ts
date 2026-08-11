import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";

/**
 * Keeps payroll payslip branding aligned with the organization profile
 * so payslips and emails use the same company name and logo.
 */
export async function syncOrganizationBrandingToPayroll(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  companyName: string,
  logoStoragePath: string | null,
): Promise<void> {
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
  const payroll = (currentSettings.payroll as Record<string, unknown> | undefined) ?? {};
  const payslip = (payroll.payslip as Record<string, unknown> | undefined) ?? {};

  const nextSettings = {
    ...currentSettings,
    payroll: {
      ...payroll,
      payslip: {
        ...payslip,
        companyName: companyName.trim(),
        ...(logoStoragePath ? { companyLogoPath: logoStoragePath } : {}),
      },
    },
  };

  const rowPayload = {
    settings: nextSettings,
    updated_by: profile.userId,
    updated_at: new Date().toISOString(),
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
