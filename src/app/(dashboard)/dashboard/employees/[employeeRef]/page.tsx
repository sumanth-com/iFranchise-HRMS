import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Pencil } from "lucide-react";

import { EmployeeDetailView } from "@/components/employees/employee-detail-view";
import { EmployeeAccountStatusBadge } from "@/components/employees/employee-account-status-badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { buttonVariants } from "@/components/common/button";
import { getEmployeeDetailBundleAction } from "@/lib/employees/actions";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { buildEmployeeRouteRef, isEmployeeUuid } from "@/lib/employees/routing";
import { hasPermission } from "@/lib/permissions/utils";
import { cn } from "@/lib/utils";

type EmployeeDetailPageProps = {
  params: Promise<{ employeeRef: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: EmployeeDetailPageProps) {
  const { employeeRef } = await params;
  const rawSearchParams = await searchParams;
  const bundle = await getEmployeeDetailBundleAction(employeeRef);

  if (!bundle) {
    notFound();
  }

  const canonicalRef = buildEmployeeRouteRef(bundle.employee);
  const query = new URLSearchParams();

  Object.entries(rawSearchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    }
  });

  const queryString = query.toString();

  if (employeeRef !== canonicalRef || isEmployeeUuid(employeeRef)) {
    redirect(
      `${EMPLOYEE_ROUTES.detail(bundle.employee)}${queryString ? `?${queryString}` : ""}`,
    );
  }

  const canEdit = hasPermission(bundle.permissionCodes, "employee.edit");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={EMPLOYEE_ROUTES.list}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-0")}
        >
          ← Back to employees
        </Link>
        <div className="flex items-center gap-2">
          <EmployeeAccountStatusBadge status={bundle.employee.accountStatus} />
          {canEdit ? (
            <Link
              href={EMPLOYEE_ROUTES.edit(bundle.employee)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
            >
              <Pencil className="size-4" />
              Edit employee
            </Link>
          ) : null}
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <EmployeeDetailView
          employee={bundle.employee}
          profileImageUrl={bundle.profileImageUrl}
          attendance={bundle.attendance}
          leaveRequests={bundle.leaveRequests}
          leaveApprovals={bundle.leaveApprovals}
          payrollItems={bundle.payrollItems}
          bankAccounts={bundle.bankAccounts}
          leaveBalances={bundle.leaveBalances}
          salaryStructure={bundle.salaryStructure}
          attendanceSummary={bundle.attendanceSummary}
          timeline={bundle.timeline}
          assets={bundle.assets}
          permissionCodes={bundle.permissionCodes}
          roleAssignment={bundle.roleAssignment}
          assignableRoles={bundle.assignableRoles}
        />
      </Suspense>
    </div>
  );
}
