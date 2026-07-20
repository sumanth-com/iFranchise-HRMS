import { WorkingConfigurationForm } from "@/components/company-settings/company-settings-section-forms";
import { canEditCompanySettings } from "@/lib/company-settings/constants";
import { getCompanySettings } from "@/lib/company-settings/services/company-settings-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function AttendanceSettingsPage() {
  const profile = await requireServerAnyPermission(["attendance.view", "settings.view"]);
  const supabase = await createClient();
  const settings = await getCompanySettings(supabase, profile.employee.organizationId);
  const canEdit = canEditCompanySettings(profile);

  return (
    <div className="flex min-h-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Office working days, work hours, grace time, weekend rules, and default shifts.
        </p>
      </div>
      <WorkingConfigurationForm
        working={settings.working}
        shiftTemplates={settings.shiftTemplates}
        canEdit={canEdit}
      />
    </div>
  );
}
