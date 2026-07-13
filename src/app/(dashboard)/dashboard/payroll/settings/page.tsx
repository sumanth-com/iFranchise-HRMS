import { PayrollSettingsForm } from "@/components/payroll/payroll-settings-form";
import { fetchPayrollSettingsAction } from "@/lib/payroll/actions";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";

export default async function PayrollSettingsPage() {
  const profile = await requireServerPermission("payroll.view");
  const record = await fetchPayrollSettingsAction();
  const canEdit = hasAnyPermission(profile.permissionCodes, [
    "settings.edit",
    "settings.manage",
    "payroll.edit",
    "payroll.approve",
  ]);

  return <PayrollSettingsForm record={record} canEdit={canEdit} />;
}
