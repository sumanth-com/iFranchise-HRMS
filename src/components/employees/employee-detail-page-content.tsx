"use client";

import Link from "next/link";
import { useState } from "react";

import { EmployeeDetailTabBar } from "@/components/employees/employee-detail-tab-bar";
import { EmployeeDetailView } from "@/components/employees/employee-detail-view";
import { buttonVariants } from "@/components/common/button";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import type {
  EmployeeAttendanceSummary,
  EmployeeBankAccountDetail,
  EmployeeDetail,
  EmployeeLeaveApprovalDetail,
  EmployeeLeaveBalanceDetail,
  EmployeeLeaveRequestDetail,
  EmployeeSalaryStructureDetail,
  LookupOption,
} from "@/types/employee";
import type { AssetAssignmentItem } from "@/types/assets";
import type { EmployeeAssetsData } from "@/types/employee-assets";
import type { EmployeeDocumentsExplorerData } from "@/types/employee-documents-explorer";
import type { EmployeePayrollData } from "@/types/employee-payroll";
import { cn } from "@/lib/utils";

type EmployeeDetailPageContentProps = {
  employee: EmployeeDetail;
  profileImageUrl: string | null;
  attendance: Array<Record<string, unknown>>;
  leaveRequests: EmployeeLeaveRequestDetail[];
  leaveApprovals: EmployeeLeaveApprovalDetail[];
  payrollItems: Array<Record<string, unknown>>;
  bankAccounts: EmployeeBankAccountDetail[];
  leaveBalances: EmployeeLeaveBalanceDetail[];
  salaryStructure: EmployeeSalaryStructureDetail | null;
  attendanceSummary: EmployeeAttendanceSummary;
  assets: AssetAssignmentItem[];
  documentsExplorer: EmployeeDocumentsExplorerData;
  assetsData: EmployeeAssetsData;
  payrollData: EmployeePayrollData | null;
  permissionCodes: string[];
  lookups: {
    branches: LookupOption[];
    departments: LookupOption[];
    designations: LookupOption[];
    employmentTypes: LookupOption[];
    managers: LookupOption[];
  };
};

export function EmployeeDetailPageContent({
  employee,
  profileImageUrl,
  attendance,
  leaveRequests,
  leaveApprovals,
  payrollItems,
  bankAccounts,
  leaveBalances,
  salaryStructure,
  attendanceSummary,
  assets,
  documentsExplorer,
  assetsData,
  payrollData,
  permissionCodes,
  lookups,
}: EmployeeDetailPageContentProps) {
  const [isEditing, setIsEditing] = useState(false);

  function toggleEditing() {
    setIsEditing((current) => !current);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b bg-background px-4 md:px-6">
        <div className="flex items-center pt-2.5 pb-1.5">
          <Link
            href={EMPLOYEE_ROUTES.list}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-7 px-0 text-muted-foreground hover:text-foreground",
            )}
          >
            ← Back to employees
          </Link>
        </div>
        <EmployeeDetailTabBar
          employee={employee}
          onTabChange={(tab) => {
            if (isEditing && tab !== "overview") {
              setIsEditing(false);
            }
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-6 pb-8 md:px-6">
        <EmployeeDetailView
          employee={employee}
          profileImageUrl={profileImageUrl}
          attendance={attendance}
          leaveRequests={leaveRequests}
          leaveApprovals={leaveApprovals}
          payrollItems={payrollItems}
          bankAccounts={bankAccounts}
          leaveBalances={leaveBalances}
          salaryStructure={salaryStructure}
          attendanceSummary={attendanceSummary}
          assets={assets}
          documentsExplorer={documentsExplorer}
          assetsData={assetsData}
          payrollData={payrollData}
          permissionCodes={permissionCodes}
          lookups={lookups}
          isEditing={isEditing}
          onToggleEdit={toggleEditing}
          onCancelEdit={() => setIsEditing(false)}
          onSavedEdit={() => setIsEditing(false)}
        />
      </div>
    </div>
  );
}
