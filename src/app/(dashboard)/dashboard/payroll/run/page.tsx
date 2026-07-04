import { PayrollRunForm } from "@/components/payroll/payroll-run-form";
import {
  canRunPayroll,
} from "@/lib/payroll/constants";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function PayrollRunPage() {
  const profile = await requireServerPermission("payroll.view");
  const now = new Date();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Run Payroll</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate monthly payroll from salary structures, attendance, leave, bonuses, and reimbursements.
        </p>
      </div>
      <PayrollRunForm
        defaultMonth={now.getMonth() + 1}
        defaultYear={now.getFullYear()}
        canRun={canRunPayroll(profile.permissionCodes)}
      />
    </>
  );
}
