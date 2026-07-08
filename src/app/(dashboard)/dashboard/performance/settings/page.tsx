import { PerformanceSettingsForm } from "@/components/performance/performance-settings-form";
import { createClient } from "@/lib/supabase/server";
import { canManagePerformanceSettings } from "@/lib/performance/constants";
import { getPerformanceSettings } from "@/lib/performance/services/performance-settings";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function PerformanceSettingsPage() {
  const profile = await requireServerPermission("performance.view");
  const supabase = await createClient();
  const record = await getPerformanceSettings(supabase, profile.employee.organizationId);
  const canEdit = canManagePerformanceSettings(profile.permissionCodes);

  return (
    <div className="flex min-h-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure review cycles, rating scales, goal categories, promotion rules, and notifications.
        </p>
      </div>
      <PerformanceSettingsForm record={record} canEdit={canEdit} />
    </div>
  );
}
