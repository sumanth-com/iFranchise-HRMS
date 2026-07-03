import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EmployeeDetailView } from "@/components/employees/employee-detail-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { buttonVariants } from "@/components/common/button";
import { getEmployeeDetailBundleAction } from "@/lib/employees/actions";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { cn } from "@/lib/utils";

type EmployeeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = await params;
  const bundle = await getEmployeeDetailBundleAction(id);

  if (!bundle) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href={EMPLOYEE_ROUTES.list}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-0")}
      >
        ← Back to employees
      </Link>

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
          payrollItems={bundle.payrollItems}
          permissionCodes={bundle.permissionCodes}
        />
      </Suspense>
    </div>
  );
}
