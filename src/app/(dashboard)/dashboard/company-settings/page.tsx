import { redirect } from "next/navigation";

import { CompanySettingsSectionView } from "@/components/company-settings/company-settings-section-view";
import {
  canEditCompanySettings,
  COMPANY_SETTINGS_ROUTES,
  COMPANY_SETTINGS_VIEW_PERMISSIONS,
} from "@/lib/company-settings/constants";
import { getCompanySettings } from "@/lib/company-settings/services/company-settings-queries";
import { getOrganizationLogoSignedUrl } from "@/lib/organization/services/org-logo";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ section?: string }>;
};

export default async function CompanySettingsPage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission([...COMPANY_SETTINGS_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const settings = await getCompanySettings(supabase, profile.employee.organizationId);
  const logoUrl = await getOrganizationLogoSignedUrl(
    supabase,
    settings.profile.logoStoragePath,
  );
  const params = await searchParams;

  if (params.section && params.section !== "profile") {
    redirect(COMPANY_SETTINGS_ROUTES.base);
  }

  const canEdit = canEditCompanySettings(profile);

  return (
    <CompanySettingsSectionView
      section="profile"
      settings={settings}
      logoUrl={logoUrl}
      canEdit={canEdit}
    />
  );
}
