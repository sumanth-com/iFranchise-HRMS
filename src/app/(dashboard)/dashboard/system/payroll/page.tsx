import Link from "next/link";

import { Button } from "@/components/common/button";
import { EmployeePayrollView } from "@/components/employee/payroll/employee-payroll-view";
import { siteConfig } from "@/config/site";
import { getEmployeePayrollData } from "@/lib/employee/services/employee-payroll-queries";
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`${SYSTEM_ADMIN_ROUTES.payroll}/settings`} />}
        >
          Settings
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        <EmployeePayrollView data={data} showPolicyLink={false} showPageHeading={false} />
      </div>
    </div>
  );
}
