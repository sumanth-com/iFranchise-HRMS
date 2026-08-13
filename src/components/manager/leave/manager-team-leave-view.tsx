"use client";

import { HrTeamLeaveView } from "@/components/leave/hr-team-leave-view";
import { fetchTeamLeaveRequestsForHrTableAction } from "@/lib/manager/actions/manager-leave-actions";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import type { LeaveListItem, LeaveSummary } from "@/types/leave";
import type { LookupOption } from "@/types/employee";
import type { TeamLeaveSummary } from "@/types/manager-leave";

function toLeaveSummary(summary: TeamLeaveSummary): LeaveSummary {
  return {
    pendingRequests: summary.pendingRequests,
    approvedThisMonth: summary.approvedThisMonth,
    rejectedThisMonth: summary.rejectedThisMonth,
    employeesOnLeaveToday: summary.employeesOnLeaveToday,
    balanceUtilizationPercent: summary.balanceUtilizationPercent,
    upcomingPlannedLeaves: summary.upcomingPlannedLeaves,
  };
}

type ManagerTeamLeaveViewProps = {
  summary: TeamLeaveSummary;
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
  employeeId?: string;
  leaveTypes: LookupOption[];
  departments: LookupOption[];
  employees: LookupOption[];
};

export function ManagerTeamLeaveView({
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
  employeeId,
  leaveTypes,
  departments,
  employees,
}: ManagerTeamLeaveViewProps) {
  return (
    <HrTeamLeaveView
      summary={toLeaveSummary(summary)}
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
      employeeId={employeeId}
      leaveTypes={leaveTypes}
      departments={departments}
      branches={[]}
      employees={employees}
      managers={[]}
      canCreate={false}
      canApprove={false}
      canReject={false}
      canCancel={false}
      canDelete={false}
      listBasePath={MANAGER_ROUTES.leaveTeam}
      fetchRecords={fetchTeamLeaveRequestsForHrTableAction}
      title="Team Leave"
      description="View leave requests and balances for people in your reporting hierarchy. This page is read-only."
    />
  );
}
