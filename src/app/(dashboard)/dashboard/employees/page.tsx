import { Suspense } from "react";

import { EmployeeTable } from "@/components/employees/employee-table";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { createClient } from "@/lib/supabase/server";
import { requireServerPermission } from "@/lib/permissions/server";
import {
  getBranches,
  getDepartments,
  listEmployees,
} from "@/lib/employees/services/employee-queries";
import { employeeListParamsSchema } from "@/lib/validations/employee";
import { hasPermission } from "@/lib/permissions/utils";

type EmployeesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const profile = await requireServerPermission("employee.view");
  const supabase = await createClient();
  const rawParams = await searchParams;

  const params = employeeListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    search: typeof rawParams.search === "string" ? rawParams.search : undefined,
    sortBy: rawParams.sortBy,
    sortOrder: rawParams.sortOrder,
    branchId: rawParams.branchId,
    departmentId: rawParams.departmentId,
    employmentStatus: rawParams.employmentStatus,
  });

  const [result, branches, departments] = await Promise.all([
    listEmployees(supabase, profile, params),
    getBranches(supabase, profile.employee.organizationId),
    getDepartments(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <p className="text-sm text-muted-foreground">
          Manage employee records, employment details, and related information.
        </p>
      </div>

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
          branchId={params.branchId}
          departmentId={params.departmentId}
          employmentStatus={params.employmentStatus}
          branches={branches}
          departments={departments}
          canCreate={hasPermission(profile.permissionCodes, "employee.create")}
          canEdit={hasPermission(profile.permissionCodes, "employee.edit")}
          canDelete={hasPermission(profile.permissionCodes, "employee.delete")}
        />
      </Suspense>
    </div>
  );
}
