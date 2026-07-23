import { redirect } from "next/navigation";

import { CompanySettingsSectionView } from "@/components/company-settings/company-settings-section-view";
import {
  canEditCompanySettings,
  COMPANY_SETTINGS_ROUTES,
  COMPANY_SETTINGS_SECTIONS,
  COMPANY_SETTINGS_VIEW_PERMISSIONS,
  DEPRECATED_COMPANY_SETTINGS_SECTIONS,
  isCompanySettingsSection,
} from "@/lib/company-settings/constants";
import { getCompanySettings } from "@/lib/company-settings/services/company-settings-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { CompanySettingsSection } from "@/types/company-settings";

type PageProps = {
  searchParams: Promise<{ section?: string }>;
};

export default async function CompanySettingsPage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission([...COMPANY_SETTINGS_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const settings = await getCompanySettings(supabase, profile.employee.organizationId);
  const params = await searchParams;

  if (
    params.section &&
    DEPRECATED_COMPANY_SETTINGS_SECTIONS.includes(
      params.section as (typeof DEPRECATED_COMPANY_SETTINGS_SECTIONS)[number],
    )
  ) {
    redirect(COMPANY_SETTINGS_ROUTES.section("profile"));
  }

  const section: CompanySettingsSection = isCompanySettingsSection(params.section)
    ? params.section
    : "profile";
  const canEdit = canEditCompanySettings(profile);
  const meta = COMPANY_SETTINGS_SECTIONS.find((item) => item.id === section);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Company Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {meta?.description ?? "Manage organization profile and HR policies."}
        </p>
      </div>

      <CompanySettingsSectionView section={section} settings={settings} canEdit={canEdit} />
    </div>
  );
}
