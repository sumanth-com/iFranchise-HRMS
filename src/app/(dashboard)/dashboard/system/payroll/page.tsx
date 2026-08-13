import { EmployeePayrollView } from "@/components/employee/payroll/employee-payroll-view";
import { siteConfig } from "@/config/site";
import { getEmployeePayrollData } from "@/lib/employee/services/employee-payroll-queries";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { createClient } from "@/lib/supabase/server";

export default async function SuperAdminPayrollPage() {
  const profile = await requireSuperAdminProfile();
  const supabase = await createClient();
  const data = await getEmployeePayrollData(supabase, profile, {
    appOrigin: siteConfig.url,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="flex flex-col gap-4">
        <EmployeePayrollView data={data} showPolicyLink={false} />
      </div>
    </div>
  );
}
