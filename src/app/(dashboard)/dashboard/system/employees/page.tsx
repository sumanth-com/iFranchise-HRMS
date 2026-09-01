import { Suspense } from "react";
import { redirect } from "next/navigation";

import { EmployeeTable } from "@/components/employees/employee-table";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { PageScroll } from "@/components/common/sticky-layout";
import { createClient } from "@/lib/supabase/server";
import { requireServerPermission } from "@/lib/permissions/server";
import {
  getDepartments,
  listEmployees,
} from "@/lib/employees/services/employee-queries";
import { employeeListParamsSchema } from "@/lib/validations/employee";
import { hasPermission } from "@/lib/permissions/utils";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { ErrorState } from "@/components/common/error-state";
import { safeServerCallWithError } from "@/lib/errors/safe-server";

const SYSTEM_EMPLOYEE_LIST = SYSTEM_ADMIN_ROUTES.employees;

type EmployeesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function SuperAdminEmployeesPage({
  searchParams,
}: EmployeesPageProps) {
  await requireSuperAdminProfile();
  const profile = await requireServerPermission("employee.view");
  const supabase = await createClient();
  const rawParams = await searchParams;

  const departments = await getDepartments(
    supabase,
    profile.employee.organizationId,
  );

  const legacyDepartmentId = firstString(rawParams.departmentId);
  const legacyBranchId = firstString(rawParams.branchId);
  const rawDepartment = firstString(rawParams.department);

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
    redirect(
      query ? `${SYSTEM_EMPLOYEE_LIST}?${query}` : SYSTEM_EMPLOYEE_LIST,
    );
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
  });

  const { data: result, error: listError } = await safeServerCallWithError(
    () => listEmployees(supabase, profile, params),
    {
      data: [],
      total: 0,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    },
    "[system/employees] listEmployees",
  );

  return (
    <PageScroll>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Administrative visibility and account intervention. HR remains the
            primary operational owner of day-to-day employee management.
          </p>
        </div>

        {listError ? (
          <ErrorState
            title="Unable to load employees"
            description={listError}
          />
        ) : (
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
              departments={departments}
              canEdit={hasPermission(profile.permissionCodes, "employee.edit")}
              canDelete={false}
              routesBasePath={SYSTEM_EMPLOYEE_LIST}
            />
          </Suspense>
        )}
      </div>
    </PageScroll>
  );
}
