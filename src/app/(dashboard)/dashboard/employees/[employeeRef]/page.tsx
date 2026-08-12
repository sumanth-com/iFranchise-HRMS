import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { EmployeeDetailPageContent } from "@/components/employees/employee-detail-page-content";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { getEmployeeDetailBundleAction } from "@/lib/employees/actions";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { buildEmployeeRouteRef, isEmployeeUuid } from "@/lib/employees/routing";

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
      `${EMPLOYEE_ROUTES.detail(bundle.employee)}${queryString ? `?${queryString}` : ""}`,
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
        />
      </Suspense>
    </div>
  );
}
