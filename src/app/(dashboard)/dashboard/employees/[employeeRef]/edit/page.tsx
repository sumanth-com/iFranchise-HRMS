import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmployeeEditForm } from "@/components/employees/employee-edit-form";
import { buttonVariants } from "@/components/common/button";
import { createClient } from "@/lib/supabase/server";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import { getEmployeeLookups } from "@/lib/employees/services/employee-queries";
import { resolveEmployeeFromRouteRef } from "@/lib/employees/services/employee-route-resolver";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { buildEmployeeRouteRef, isEmployeeUuid } from "@/lib/employees/routing";
import { requireServerPermission } from "@/lib/permissions/server";
import { cn } from "@/lib/utils";

type EmployeeEditPageProps = {
  params: Promise<{ employeeRef: string }>;
};

export default async function EmployeeEditPage({ params }: EmployeeEditPageProps) {
  const profile = await requireServerPermission("employee.edit");
  const { employeeRef } = await params;
  const supabase = await createClient();

  const resolved = await resolveEmployeeFromRouteRef(
    supabase,
    profile.employee.organizationId,
    employeeRef,
  );

  if (!resolved) {
    notFound();
  }

  const canonicalRef = buildEmployeeRouteRef(resolved);

  if (employeeRef !== canonicalRef || isEmployeeUuid(employeeRef)) {
    redirect(EMPLOYEE_ROUTES.edit(resolved));
  }

  const [employee, lookups] = await Promise.all([
    getEmployeeById(supabase, resolved.id),
    getEmployeeLookups(supabase, profile.employee.organizationId, resolved.id),
  ]);

  if (!employee) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit employee</h1>
          <p className="text-sm text-muted-foreground">
            Update employment and contact information for {employee.firstName}{" "}
            {employee.lastName}.
          </p>
        </div>
        <Link
          href={EMPLOYEE_ROUTES.detail(employee)}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Cancel
        </Link>
      </div>

      <EmployeeEditForm employee={employee} lookups={lookups} />
    </div>
  );
}
