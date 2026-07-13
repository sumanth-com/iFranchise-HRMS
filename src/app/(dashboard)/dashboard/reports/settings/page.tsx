import { ReportsSettingsForm } from "@/components/reports/reports-settings-form";
import { canReportsSettings } from "@/lib/reports/constants";
import { getReportsSettings } from "@/lib/reports/services/reports-settings";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsSettingsPage() {
  const profile = await requireServerPermission("reports.view");
  const supabase = await createClient();
  const settings = await getReportsSettings(supabase, profile.employee.organizationId);
  const canEdit = canReportsSettings(profile.permissionCodes);

  return <ReportsSettingsForm settings={settings} canEdit={canEdit} />;
}
