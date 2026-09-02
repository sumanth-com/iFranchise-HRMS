import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { EmployeeDetailPageContent } from "@/components/employees/employee-detail-page-content";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { getEmployeeDetailBundleAction } from "@/lib/employees/actions";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { buildEmployeeModuleRoutes } from "@/lib/employees/constants";
import { buildEmployeeRouteRef, isEmployeeUuid } from "@/lib/employees/routing";

const CEO_EMPLOYEE_ROUTES = buildEmployeeModuleRoutes(CEO_ROUTES.employees);

type EmployeeDetailPageProps = {
  params: Promise<{ employeeRef: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CeoEmployeeDetailPage({
  params,
  searchParams,
}: EmployeeDetailPageProps) {
  await requireServerAnyPermission([PORTAL_PERMISSIONS.ceo, "employee.view"]);
  const { employeeRef } = await params;
  const rawSearchParams = await searchParams;
  const bundle = await getEmployeeDetailBundleAction(employeeRef, rawSearchParams);

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
      `${CEO_EMPLOYEE_ROUTES.detail(bundle.employee)}${queryString ? `?${queryString}` : ""}`,
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <EmployeeDetailPageContent
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
          attendancePeriod={bundle.attendancePeriod}
          assets={bundle.assets}
          documentsExplorer={bundle.documentsExplorer}
          assetsData={bundle.assetsData}
          payrollData={bundle.payrollData}
          permissionCodes={bundle.permissionCodes}
          lookups={bundle.lookups}
          routesBasePath={CEO_ROUTES.employees}
        />
      </Suspense>
    </div>
  );
}
