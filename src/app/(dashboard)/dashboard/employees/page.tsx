import { Suspense } from "react";
import { redirect } from "next/navigation";

import { EmployeeTable } from "@/components/employees/employee-table";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { PageScroll } from "@/components/common/sticky-layout";
import { createClient } from "@/lib/supabase/server";
import { requireServerPermission } from "@/lib/permissions/server";
import {
  getOccupiedDepartments,
  getEmployeeLookups,
  listEmployees,
} from "@/lib/employees/services/employee-queries";
import {
  DEFAULT_EMPLOYMENT_CATEGORY_FILTER,
  type EmploymentCategoryFilter,
} from "@/lib/employees/employment-category";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
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

function parseEmploymentCategory(
  value: string | undefined,
): EmploymentCategoryFilter {
  if (value === "all" || value === "probation" || value === "full_time") {
    return value;
  }
  return DEFAULT_EMPLOYMENT_CATEGORY_FILTER;
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const profile = await requireServerPermission("employee.view");
  const supabase = await createClient();
  const rawParams = await searchParams;

  const legacyDepartmentId = firstString(rawParams.departmentId);
  const legacyBranchId = firstString(rawParams.branchId);
  const rawDepartment = firstString(rawParams.department);
  const needsLegacyCleanup =
    Boolean(legacyDepartmentId) || Boolean(legacyBranchId) || Boolean(rawDepartment);

  // Fast path: no legacy URL rewrite — load list + departments together.
  if (!needsLegacyCleanup) {
    const params = employeeListParamsSchema.parse({
      page: rawParams.page,
      pageSize: rawParams.pageSize,
      search: firstString(rawParams.search),
      sortBy: rawParams.sortBy,
      sortOrder: rawParams.sortOrder,
      department: rawDepartment,
      employmentStatus: firstString(rawParams.employmentStatus),
      accountStatus: firstString(rawParams.accountStatus),
      employmentCategory: parseEmploymentCategory(firstString(rawParams.employmentCategory)),
    });

    const [departments, lookups, result] = await Promise.all([
      getOccupiedDepartments(supabase, profile.employee.organizationId),
      getEmployeeLookups(supabase, profile.employee.organizationId),
      listEmployees(supabase, profile, params),
    ]);

    return (
      <PageScroll>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
            <p className="text-sm text-muted-foreground">
              Manage employee records, employment details, and related information.
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
              employmentCategory={params.employmentCategory}
              departments={departments}
              employmentTypes={lookups.employmentTypes}
              canEdit={hasPermission(profile.permissionCodes, "employee.edit")}
              canDelete={hasPermission(profile.permissionCodes, "employee.delete")}
            />
          </Suspense>
        </div>
      </PageScroll>
    );
  }

  const departments = await getOccupiedDepartments(
    supabase,
    profile.employee.organizationId,
  );

  let departmentCode =
    rawDepartment &&
    departments.find(
      (item) => item.code?.toLowerCase() === rawDepartment.toLowerCase(),
    )?.code;

  if (!departmentCode && legacyDepartmentId) {
    departmentCode = departments.find(
      (item) => item.id === legacyDepartmentId,
    )?.code;
  }

  const shouldCleanUrl =
    Boolean(legacyDepartmentId) ||
    Boolean(legacyBranchId) ||
    Boolean(rawDepartment && departmentCode && rawDepartment !== departmentCode);

  if (shouldCleanUrl) {
    const cleaned = new URLSearchParams();
    const page = firstString(rawParams.page);
    const pageSize = firstString(rawParams.pageSize);
    const search = firstString(rawParams.search);
    const sortBy = firstString(rawParams.sortBy);
    const sortOrder = firstString(rawParams.sortOrder);
    const employmentStatus = firstString(rawParams.employmentStatus);
    const accountStatus = firstString(rawParams.accountStatus);

    if (page) cleaned.set("page", page);
    if (pageSize) cleaned.set("pageSize", pageSize);
    if (search) cleaned.set("search", search);
    if (sortBy) cleaned.set("sortBy", sortBy);
    if (sortOrder) cleaned.set("sortOrder", sortOrder);
    if (employmentStatus) cleaned.set("employmentStatus", employmentStatus);
    if (accountStatus) cleaned.set("accountStatus", accountStatus);
    if (departmentCode) cleaned.set("department", departmentCode);

    const query = cleaned.toString();
    redirect(query ? `${EMPLOYEE_ROUTES.list}?${query}` : EMPLOYEE_ROUTES.list);
  }

  const params = employeeListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    search: firstString(rawParams.search),
    sortBy: rawParams.sortBy,
    sortOrder: rawParams.sortOrder,
    department: departmentCode,
    employmentStatus: firstString(rawParams.employmentStatus),
    accountStatus: firstString(rawParams.accountStatus),
    employmentCategory: parseEmploymentCategory(firstString(rawParams.employmentCategory)),
  });

  const [lookups, result] = await Promise.all([
    getEmployeeLookups(supabase, profile.employee.organizationId),
    listEmployees(supabase, profile, params),
  ]);

  return (
    <PageScroll>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Manage employee records, employment details, and related information.
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
            department={departmentCode}
            employmentStatus={params.employmentStatus}
            employmentCategory={params.employmentCategory}
            departments={departments}
            employmentTypes={lookups.employmentTypes}
            canEdit={hasPermission(profile.permissionCodes, "employee.edit")}
            canDelete={hasPermission(profile.permissionCodes, "employee.delete")}
          />
        </Suspense>
      </div>
    </PageScroll>
  );
}
