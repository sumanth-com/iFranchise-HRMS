import { RecruitmentSettingsForm } from "@/components/recruitment/recruitment-settings-form";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";
import { getRecruitmentLookups } from "@/lib/recruitment/services/recruitment-queries";
import { getRecruitmentSettings } from "@/lib/recruitment/services/recruitment-settings";
import { createClient } from "@/lib/supabase/server";

export default async function RecruitmentSettingsPage() {
  const profile = await requireServerPermission("recruitment.view");
  const supabase = await createClient();
  const [settings, lookups] = await Promise.all([
    getRecruitmentSettings(supabase, profile.employee.organizationId),
    getRecruitmentLookups(supabase, profile.employee.organizationId),
  ]);
  const canEdit = hasAnyPermission(profile.permissionCodes, [
    "recruitment.edit",
    "settings.edit",
  ]);

  return (
    <RecruitmentSettingsForm
      settings={settings}
      managers={lookups.employees}
      canEdit={canEdit}
    />
  );
}
