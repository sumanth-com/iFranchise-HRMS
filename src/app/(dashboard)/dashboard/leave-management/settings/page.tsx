import { LeavePoliciesForm } from "@/components/company-settings/company-settings-section-forms";
import { canEditCompanySettings } from "@/lib/company-settings/constants";
import { getCompanySettings } from "@/lib/company-settings/services/company-settings-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function LeaveSettingsPage() {
  const profile = await requireServerAnyPermission(["leave.view", "settings.view"]);
  const supabase = await createClient();
  const settings = await getCompanySettings(supabase, profile.employee.organizationId);
  const canEdit = canEditCompanySettings(profile);

  return (
    <div className="flex min-h-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leave Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Leave year, approvals, half-day rules, carry forward, and encashment.
        </p>
      </div>
      <LeavePoliciesForm leave={settings.leave} canEdit={canEdit} />
    </div>
  );
}
