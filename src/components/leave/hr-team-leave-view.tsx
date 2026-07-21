"use client";

import { Suspense } from "react";

import { LeaveSummaryCards } from "@/components/leave/leave-summary-cards";
import { LeaveTable } from "@/components/leave/leave-table";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type { LeaveListItem, LeaveSummary } from "@/types/leave";
import type { LookupOption } from "@/types/employee";

type HrTeamLeaveViewProps = {
  summary: LeaveSummary;
  records: LeaveListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  month: number;
  year: number;
  leaveStatus?: string;
  leaveTypeId?: string;
  departmentId?: string;
  branchId?: string;
  approverId?: string;
  reportingManagerId?: string;
  employeeId?: string;
  leaveTypes: LookupOption[];
  departments: LookupOption[];
  branches: LookupOption[];
  employees: LookupOption[];
  approvers: LookupOption[];
  managers: LookupOption[];
  canCreate: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  embedded?: boolean;
};

export function HrTeamLeaveView({
  summary,
  records,
  total,
  page,
  pageSize,
  search,
  month,
  year,
  leaveStatus,
  leaveTypeId,
  departmentId,
  branchId,
  approverId,
  reportingManagerId,
  employeeId,
  leaveTypes,
  departments,
  branches,
  employees,
  approvers,
  managers,
  canCreate,
  canApprove,
  canReject,
  canCancel,
  embedded = false,
}: HrTeamLeaveViewProps) {
  return (
    <div className="space-y-6">
      <div>
        {embedded ? (
          <h2 className="text-lg font-semibold tracking-tight">Team Leave</h2>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">Leave & Approvals</h1>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Track leave requests, approvals, balances, and workforce availability across the
          organization.
        </p>
      </div>

      <LeaveSummaryCards summary={summary} />

      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <LeaveTable
          records={records}
          total={total}
          page={page}
          pageSize={pageSize}
          search={search}
          month={month}
          year={year}
          leaveStatus={leaveStatus}
          leaveTypeId={leaveTypeId}
          departmentId={departmentId}
          branchId={branchId}
          approverId={approverId}
          reportingManagerId={reportingManagerId}
          employeeId={employeeId}
          leaveTypes={leaveTypes}
          departments={departments}
          branches={branches}
          employees={employees}
          approvers={approvers}
          managers={managers}
          canCreate={canCreate}
          canApprove={canApprove}
          canReject={canReject}
          canCancel={canCancel}
          embedded
        />
      </Suspense>
    </div>
  );
}
