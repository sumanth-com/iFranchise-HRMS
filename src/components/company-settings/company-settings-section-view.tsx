"use client";

import { PayrollSettingsForm } from "@/components/payroll/payroll-settings-form";
import { PerformanceSettingsForm } from "@/components/performance/performance-settings-form";
import { RecruitmentSettingsForm } from "@/components/recruitment/recruitment-settings-form";
import { CompanyProfileSettingsForm } from "@/components/company-settings/company-profile-settings-form";
import {
  BackupConfigurationForm,
  BrandingConfigurationForm,
  IntegrationsConfigurationForm,
  LeavePoliciesForm,
  NotificationsGlobalForm,
  SecurityConfigurationForm,
  WorkingConfigurationForm,
} from "@/components/company-settings/company-settings-section-forms";
import { COMPANY_SETTINGS_SECTIONS } from "@/lib/company-settings/constants";
import type { CompanySettingsBundle, CompanySettingsSection } from "@/types/company-settings";

type Props = {
  section: CompanySettingsSection;
  settings: CompanySettingsBundle;
  canEdit: boolean;
};

export function CompanySettingsSectionView({ section, settings, canEdit }: Props) {
  const meta = COMPANY_SETTINGS_SECTIONS.find((s) => s.id === section);

  return (
    <div className="flex min-h-full flex-1 flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{meta?.title ?? "Settings"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{meta?.description}</p>
      </div>

      {section === "profile" ? (
        <CompanyProfileSettingsForm profile={settings.profile} canEdit={canEdit} />
      ) : null}

      {section === "working" ? (
        <WorkingConfigurationForm
          working={settings.working}
          shiftTemplates={settings.shiftTemplates}
          canEdit={canEdit}
        />
      ) : null}

      {section === "leave" ? (
        <LeavePoliciesForm leave={settings.leave} canEdit={canEdit} />
      ) : null}

      {section === "payroll" ? (
        <PayrollSettingsForm record={settings.payroll} canEdit={canEdit} />
      ) : null}

      {section === "recruitment" ? (
        <RecruitmentSettingsForm
          settings={settings.recruitment}
          managers={settings.recruitmentManagers}
          canEdit={canEdit}
        />
      ) : null}

      {section === "performance" ? (
        <PerformanceSettingsForm record={settings.performance} canEdit={canEdit} />
      ) : null}

      {section === "notifications" ? (
        <NotificationsGlobalForm notifications={settings.notifications} canEdit={canEdit} />
      ) : null}

      {section === "security" ? (
        <SecurityConfigurationForm security={settings.security} canEdit={canEdit} />
      ) : null}

      {section === "branding" ? (
        <BrandingConfigurationForm
          branding={settings.branding}
          logoPath={settings.profile.logoStoragePath}
          canEdit={canEdit}
        />
      ) : null}

      {section === "integrations" ? (
        <IntegrationsConfigurationForm integrations={settings.integrations} canEdit={canEdit} />
      ) : null}

      {section === "backup" ? (
        <BackupConfigurationForm backup={settings.backup} canEdit={canEdit} />
      ) : null}
    </div>
  );
}
