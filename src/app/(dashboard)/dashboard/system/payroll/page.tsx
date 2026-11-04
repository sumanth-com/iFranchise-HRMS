import Link from "next/link";

import { Button } from "@/components/common/button";
import { EmployeePayrollView } from "@/components/employee/payroll/employee-payroll-view";
import { siteConfig } from "@/config/site";
import { getEmployeePayrollData } from "@/lib/employee/services/employee-payroll-queries";
import { SELF_PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
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
        <EmployeePayrollView
          data={data}
          heading="Payroll"
          headingDescription="View payslips, download salary documents, and track your compensation history."
          policyHref={SELF_PAYROLL_ROUTES.policy}
          extraHeaderActions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`${SYSTEM_ADMIN_ROUTES.payroll}/settings`} />}
            >
              Settings
            </Button>
          }
        />
      </div>
    </div>
  );
}
