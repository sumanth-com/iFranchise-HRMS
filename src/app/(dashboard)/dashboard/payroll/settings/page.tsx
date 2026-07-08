import { PayrollSettingsForm } from "@/components/payroll/payroll-settings-form";
import { createClient } from "@/lib/supabase/server";
import { getPayrollSettings } from "@/lib/payroll/services/payroll-settings";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";

export default async function PayrollSettingsPage() {
  const profile = await requireServerPermission("payroll.view");
  const supabase = await createClient();
  const record = await getPayrollSettings(supabase, profile.employee.organizationId);
  const canEdit = hasAnyPermission(profile.permissionCodes, [
    "settings.manage",
    "payroll.edit",
    "payroll.approve",
  ]);

  return (
    <div className="flex min-h-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure payroll cycles, attendance rules, approvals, payslips, and notifications.
        </p>
      </div>
      <PayrollSettingsForm record={record} canEdit={canEdit} />
    </div>
  );
}
