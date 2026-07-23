"use client";

import { CompanyProfileSettingsForm } from "@/components/company-settings/company-profile-settings-form";
import {
  BrandingConfigurationForm,
  LeavePoliciesForm,
  NotificationsGlobalForm,
  WorkingConfigurationForm,
} from "@/components/company-settings/company-settings-section-forms";
import { PayrollSettingsForm } from "@/components/payroll/payroll-settings-form";
import { PerformanceSettingsForm } from "@/components/performance/performance-settings-form";
import { RecruitmentSettingsForm } from "@/components/recruitment/recruitment-settings-form";
import type { CompanySettingsBundle, CompanySettingsSection } from "@/types/company-settings";

type Props = {
  section: CompanySettingsSection;
  settings: CompanySettingsBundle;
  canEdit: boolean;
};

export function CompanySettingsSectionView({ section, settings, canEdit }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
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

      {section === "branding" ? (
        <BrandingConfigurationForm
          branding={settings.branding}
          logoPath={settings.profile.logoStoragePath}
          canEdit={canEdit}
        />
      ) : null}
    </div>
  );
}
