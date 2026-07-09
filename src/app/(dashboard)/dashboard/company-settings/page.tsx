import { CompanySettingsSectionView } from "@/components/company-settings/company-settings-section-view";
import {
  canEditCompanySettings,
  COMPANY_SETTINGS_VIEW_PERMISSIONS,
} from "@/lib/company-settings/constants";
import { getCompanySettings } from "@/lib/company-settings/services/company-settings-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { companySettingsSectionSchema } from "@/lib/validations/company-settings";
import type { CompanySettingsSection } from "@/types/company-settings";

type PageProps = {
  searchParams: Promise<{ section?: string }>;
};

export default async function CompanySettingsPage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission([...COMPANY_SETTINGS_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const settings = await getCompanySettings(supabase, profile.employee.organizationId);
  const params = await searchParams;

  const parsed = companySettingsSectionSchema.safeParse(params.section);
  const section: CompanySettingsSection = parsed.success ? parsed.data : "profile";
  const canEdit = canEditCompanySettings(profile);

  return (
    <CompanySettingsSectionView
      section={section}
      settings={settings}
      canEdit={canEdit}
    />
  );
}
