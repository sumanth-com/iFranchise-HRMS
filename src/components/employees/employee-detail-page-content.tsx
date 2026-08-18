"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { EmployeeDetailTabBar } from "@/components/employees/employee-detail-tab-bar";
import { EmployeeDetailView } from "@/components/employees/employee-detail-view";
import { buttonVariants } from "@/components/common/button";
import {
  resolveEmployeeModuleRoutes,
  resolveEmployeeTab,
  type EmployeeTab,
} from "@/lib/employees/constants";
import type {
  EmployeeAttendancePeriod,
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
  attendancePeriod: EmployeeAttendancePeriod;
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
  routesBasePath?: string;
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
  attendancePeriod,
  assets,
  documentsExplorer,
  assetsData,
  payrollData,
  permissionCodes,
  lookups,
  routesBasePath,
}: EmployeeDetailPageContentProps) {
  const routes = resolveEmployeeModuleRoutes(routesBasePath);
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<EmployeeTab>(() =>
    resolveEmployeeTab(searchParams.get("tab")),
  );

  function toggleEditing() {
    setIsEditing((current) => !current);
  }

  function handleTabChange(tab: EmployeeTab) {
    if (isEditing && tab !== "overview") {
      setIsEditing(false);
    }
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    window.history.replaceState(null, "", `${routes.detail(employee)}?${params.toString()}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b bg-background px-4 md:px-6">
        <div className="flex items-center pt-2.5 pb-1.5">
          <Link
            href={routes.list}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-7 px-0 text-muted-foreground hover:text-foreground",
            )}
          >
            ← Back to employees
          </Link>
        </div>
        <EmployeeDetailTabBar activeTab={activeTab} onTabChange={handleTabChange} />
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
          attendancePeriod={attendancePeriod}
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
          routesBasePath={routesBasePath}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
}
