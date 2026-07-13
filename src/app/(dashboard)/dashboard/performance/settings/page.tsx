import { PerformanceSettingsForm } from "@/components/performance/performance-settings-form";
import { fetchPerformanceSettingsAction } from "@/lib/performance/actions";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";

export default async function PerformanceSettingsPage() {
  const profile = await requireServerPermission("performance.view");
  const record = await fetchPerformanceSettingsAction();
  const canEdit = hasAnyPermission(profile.permissionCodes, [
    "performance.settings",
    "settings.edit",
  ]);

  return <PerformanceSettingsForm record={record} canEdit={canEdit} />;
}
