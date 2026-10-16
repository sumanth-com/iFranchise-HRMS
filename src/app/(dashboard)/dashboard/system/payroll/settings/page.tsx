import Link from "next/link";

import { Button } from "@/components/common/button";
import { PayrollSettingsForm } from "@/components/payroll/payroll-settings-form";
import { fetchPayrollSettingsAction } from "@/lib/payroll/actions";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";

/**
 * Payroll Settings — Super Admin / System Admin portal only.
 * Not exposed on HR/CEO/Accountant Team Payroll navigation.
 */
export default async function SystemAdminPayrollSettingsPage() {
  await requireSuperAdminProfile();
  const record = await fetchPayrollSettingsAction();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organization payroll cycle and payslip options. Available only in Super Admin.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={SYSTEM_ADMIN_ROUTES.payroll} />}
        >
          Back to Payroll
        </Button>
      </div>
      <PayrollSettingsForm record={record} canEdit variant="team" />
    </div>
  );
}
