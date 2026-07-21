"use client";

import { useState } from "react";

import { Button } from "@/components/common/button";
import { HrTeamLeaveView } from "@/components/leave/hr-team-leave-view";
import { MyLeaveSelfServiceView } from "@/components/leave/my-leave-self-service-view";
import { SELF_LEAVE_ROUTES } from "@/lib/leave/constants";
import type {
  LeaveCalendarEntry,
  LeaveEmployeeBalanceSnapshot,
  LeaveHolidayEntry,
  LeaveListItem,
  LeaveSummary,
} from "@/types/leave";
import type { LookupOption } from "@/types/employee";

type LeaveSection = "my" | "team";

type TeamLeaveData = {
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
};

type Props = {
  initialSection?: LeaveSection;
  canViewTeam: boolean;
  canApply: boolean;
  balances: LeaveEmployeeBalanceSnapshot[];
  requests: LeaveListItem[];
  calendarMonth: number;
  calendarYear: number;
  calendarLeaves: LeaveCalendarEntry[];
  calendarHolidays: LeaveHolidayEntry[];
  teamLeave: TeamLeaveData;
};

export function HrLeaveHubView({
  initialSection = "my",
  canViewTeam,
  canApply,
  balances,
  requests,
  calendarMonth,
  calendarYear,
  calendarLeaves,
  calendarHolidays,
  teamLeave,
}: Props) {
  const sectionDefault =
    initialSection === "team" && canViewTeam ? "team" : "my";
  const [section, setSection] = useState<LeaveSection>(sectionDefault);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leave</h1>
          <p className="text-sm text-muted-foreground">
            Apply and track your own leave, and manage workforce leave across the organization.
          </p>
        </div>
        {canViewTeam ? (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
            <Button
              size="sm"
              variant={section === "my" ? "default" : "ghost"}
              onClick={() => setSection("my")}
            >
              My Leave
            </Button>
            <Button
              size="sm"
              variant={section === "team" ? "default" : "ghost"}
              onClick={() => setSection("team")}
            >
              Team Leave
            </Button>
          </div>
        ) : null}
      </div>

      {section === "my" || !canViewTeam ? (
        <MyLeaveSelfServiceView
          applyHref={SELF_LEAVE_ROUTES.new}
          canApply={canApply}
          balances={balances}
          requests={requests}
          calendarMonth={calendarMonth}
          calendarYear={calendarYear}
          calendarLeaves={calendarLeaves}
          calendarHolidays={calendarHolidays}
          showPageHeading={false}
        />
      ) : (
        <HrTeamLeaveView {...teamLeave} embedded />
      )}
    </div>
  );
}
