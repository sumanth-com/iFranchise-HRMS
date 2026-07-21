import { Suspense } from "react";
import { redirect } from "next/navigation";

import { EmployeeAccountProvisioningPanel } from "@/components/employees/employee-account-provisioning-panel";
import { EmployeeTable } from "@/components/employees/employee-table";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { requireServerPermission } from "@/lib/permissions/server";
import {
  getDepartments,
  getEmployeeAccountProvisioningSummary,
  getEmployeeLookups,
  listEmployees,
} from "@/lib/employees/services/employee-queries";
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

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
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
  });

  const [result, accountProvisioning, inviteLookups] = await Promise.all([
    listEmployees(supabase, profile, params),
    getEmployeeAccountProvisioningSummary(supabase, profile),
    getEmployeeLookups(supabase, profile.employee.organizationId),
  ]);
  const canInviteEmployee = hasPermission(profile.permissionCodes, "employee_account.invite");
  const canCancelEmployeeInvitation = hasPermission(
    profile.permissionCodes,
    "employee_account.cancel_invitation",
  );
  const canActivateEmployeeAccount = hasPermission(
    profile.permissionCodes,
    "employee_account.activate",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <p className="text-sm text-muted-foreground">
          Manage employee records, employment details, and related information.
        </p>
      </div>

      {(canInviteEmployee || canCancelEmployeeInvitation || canActivateEmployeeAccount) ? (
        <EmployeeAccountProvisioningPanel
          summary={accountProvisioning}
          lookups={{
            departments: inviteLookups.departments,
            employmentTypes: inviteLookups.employmentTypes,
            managers: inviteLookups.managers,
          }}
          canInvite={canInviteEmployee}
          canCancelInvitation={canCancelEmployeeInvitation}
          canActivate={canActivateEmployeeAccount}
          inviteServiceReady={hasSupabaseServiceRoleEnv()}
        />
      ) : null}

      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
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
          accountStatus={params.accountStatus}
          departments={departments}
          canCreate={hasPermission(profile.permissionCodes, "employee.create")}
          canEdit={hasPermission(profile.permissionCodes, "employee.edit")}
          canDelete={hasPermission(profile.permissionCodes, "employee.delete")}
        />
      </Suspense>
    </div>
  );
}
