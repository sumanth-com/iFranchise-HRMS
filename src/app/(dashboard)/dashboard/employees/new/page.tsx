import Link from "next/link";

import { EmployeeWizard } from "@/components/employees/employee-wizard";
import { buttonVariants } from "@/components/common/button";
import { getEmployeeLookupsAction } from "@/lib/employees/actions";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { requireServerPermission } from "@/lib/permissions/server";
import { cn } from "@/lib/utils";

export default async function NewEmployeePage() {
  await requireServerPermission("employee.create");
  const lookups = await getEmployeeLookupsAction();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add employee</h1>
          <p className="text-sm text-muted-foreground">
            Complete the guided steps to create a new employee record.
          </p>
        </div>
        <Link
          href={EMPLOYEE_ROUTES.list}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to employees
        </Link>
      </div>

      <EmployeeWizard lookups={lookups} />
    </div>
  );
}
