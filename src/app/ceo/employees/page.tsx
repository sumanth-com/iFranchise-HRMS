import { Suspense } from "react";

import { EmployeeTable } from "@/components/employees/employee-table";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { PageScroll } from "@/components/common/sticky-layout";
import { createClient } from "@/lib/supabase/server";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerAnyPermission, requireServerPermission } from "@/lib/permissions/server";
import {
  getOccupiedDepartments,
  listEmployees,
} from "@/lib/employees/services/employee-queries";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { employeeListParamsSchema } from "@/lib/validations/employee";
import { hasPermission } from "@/lib/permissions/utils";

type EmployeesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function CeoEmployeesPage({ searchParams }: EmployeesPageProps) {
  await requireServerAnyPermission([PORTAL_PERMISSIONS.ceo, "employee.view"]);
  const profile = await requireServerPermission("employee.view");
  const supabase = await createClient();
  const rawParams = await searchParams;

  const params = employeeListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    search: firstString(rawParams.search),
    sortBy: rawParams.sortBy,
    sortOrder: rawParams.sortOrder,
    department: firstString(rawParams.department),
    employmentStatus: firstString(rawParams.employmentStatus),
    accountStatus: firstString(rawParams.accountStatus),
  });

  const [departments, result] = await Promise.all([
    getOccupiedDepartments(supabase, profile.employee.organizationId),
    listEmployees(supabase, profile, params),
  ]);

  return (
    <PageScroll>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Employee records, employment type, and related information.
          </p>
        </div>
        <Suspense fallback={<PageSkeleton />}>
          <EmployeeTable
            employees={result.data}
            total={result.total}
            page={result.page}
            pageSize={result.pageSize}
            search={params.search ?? ""}
            sortBy={params.sortBy}
            sortOrder={params.sortOrder}
            department={params.department}
            employmentStatus={params.employmentStatus}
            departments={departments}
            canEdit={hasPermission(profile.permissionCodes, "employee.edit")}
            canDelete={hasPermission(profile.permissionCodes, "employee.delete")}
            routesBasePath={CEO_ROUTES.employees}
          />
        </Suspense>
      </div>
    </PageScroll>
  );
}
