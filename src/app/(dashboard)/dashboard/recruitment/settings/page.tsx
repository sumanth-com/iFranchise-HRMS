import { RecruitmentSettingsForm } from "@/components/recruitment/recruitment-settings-form";
import { createClient } from "@/lib/supabase/server";
import { canEditRecruitment } from "@/lib/recruitment/constants";
import { getRecruitmentLookups } from "@/lib/recruitment/services/recruitment-queries";
import { getRecruitmentSettings } from "@/lib/recruitment/services/recruitment-settings";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function RecruitmentSettingsPage() {
  const profile = await requireServerPermission("recruitment.view");
  const supabase = await createClient();
  const [settings, lookups] = await Promise.all([
    getRecruitmentSettings(supabase, profile.employee.organizationId),
    getRecruitmentLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <RecruitmentSettingsForm
      settings={settings}
      managers={lookups.employees}
      canEdit={canEditRecruitment(profile.permissionCodes)}
    />
  );
}
