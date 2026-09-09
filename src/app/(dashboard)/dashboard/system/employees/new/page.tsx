import Link from "next/link";

import { EmployeeWizard } from "@/components/employees/employee-wizard";
import { buttonVariants } from "@/components/common/button";
import { PageScroll } from "@/components/common/sticky-layout";
import { getEmployeeLookupsAction } from "@/lib/employees/actions";
import { requireServerPermission } from "@/lib/permissions/server";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { cn } from "@/lib/utils";

const SYSTEM_EMPLOYEE_LIST = SYSTEM_ADMIN_ROUTES.employees;

export default async function SuperAdminNewEmployeePage() {
  await requireServerPermission("employee.create");
  const lookups = await getEmployeeLookupsAction();

  return (
    <PageScroll>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Add employee</h1>
            <p className="text-sm text-muted-foreground">
              Complete the guided steps to create a new employee record.
            </p>
          </div>
          <Link
            href={SYSTEM_EMPLOYEE_LIST}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Back to employees
          </Link>
        </div>

        <EmployeeWizard lookups={lookups} routesBasePath={SYSTEM_EMPLOYEE_LIST} />
      </div>
    </PageScroll>
  );
}
