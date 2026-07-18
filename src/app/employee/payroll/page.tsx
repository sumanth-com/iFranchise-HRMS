import { EmployeePayrollView } from "@/components/employee/payroll/employee-payroll-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getEmployeePayrollData } from "@/lib/employee/services/employee-payroll-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeePayrollPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "payslip.view",
  ]);
  const supabase = await createClient();
  const data = await getEmployeePayrollData(supabase, profile);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="flex flex-col gap-4">
        <EmployeePayrollView data={data} />
      </div>
    </div>
  );
}
