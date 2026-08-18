"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarPlus, FileText } from "lucide-react";

import { Button, buttonVariants } from "@/components/common/button";
import { ApplyLeaveDialog } from "@/components/leave/apply-leave-dialog";
import { HrTeamLeaveView } from "@/components/leave/hr-team-leave-view";
import { MyLeaveSelfServiceView } from "@/components/leave/my-leave-self-service-view";
import { LEAVE_ROUTES, SELF_LEAVE_ROUTES } from "@/lib/leave/constants";
import { cn } from "@/lib/utils";
import type {
  LeaveCalendarEntry,
  LeaveEmployeeBalanceSnapshot,
  LeaveHolidayEntry,
  LeaveListItem,
  LeaveLookups,
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
  reportingManagerId?: string;
  employeeId?: string;
  leaveTypes: LookupOption[];
  departments: LookupOption[];
  branches: LookupOption[];
  employees: LookupOption[];
  managers: LookupOption[];
  canCreate: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canDelete: boolean;
};

type Props = {
  initialSection?: LeaveSection;
  canViewTeam: boolean;
  canApply: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  employeeId: string;
  applyLeaveLookups: LeaveLookups | null;
  balances: LeaveEmployeeBalanceSnapshot[];
  requests: LeaveListItem[];
  calendarMonth: number;
  calendarYear: number;
  calendarLeaves: LeaveCalendarEntry[];
  calendarHolidays: LeaveHolidayEntry[];
  calendarContext?: import("@/lib/leave/services/leave-calendar-engine").LeaveCalendarContext;
  teamLeave: TeamLeaveData;
  teamApplyLeaveLookups: LeaveLookups | null;
};

export function HrLeaveHubView({
  initialSection = "my",
  canViewTeam,
  canApply,
  canEdit = false,
  canDelete = false,
  employeeId,
  applyLeaveLookups,
  balances,
  requests,
  calendarMonth,
  calendarYear,
  calendarLeaves,
  calendarHolidays,
  calendarContext,
  teamLeave,
  teamApplyLeaveLookups,
}: Props) {
  const router = useRouter();
  const [applyOpen, setApplyOpen] = useState(false);
  const [teamApplyOpen, setTeamApplyOpen] = useState(false);
  const section = initialSection === "team" && canViewTeam ? "team" : "my";
  const isTeamView = section === "team";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isTeamView ? "Team Leave" : "Leave"}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={isTeamView ? LEAVE_ROUTES.policy : SELF_LEAVE_ROUTES.policy}
              className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
            >
              <FileText className="size-4" />
              Leave Policy
            </Link>
            {isTeamView && teamLeave.canCreate && teamApplyLeaveLookups ? (
              <Button type="button" className="gap-1.5" onClick={() => setTeamApplyOpen(true)}>
                <CalendarPlus className="size-4" />
                Apply Leave
              </Button>
            ) : null}
            {!isTeamView && canApply && applyLeaveLookups ? (
              <Button type="button" className="gap-1.5" onClick={() => setApplyOpen(true)}>
                <CalendarPlus className="size-4" />
                Apply Leave
              </Button>
            ) : null}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {isTeamView
            ? "Review and manage leave requests across the organization."
            : "Apply for leave, track balances, and view your leave calendar."}
        </p>
      </div>

      {isTeamView ? (
        <HrTeamLeaveView {...teamLeave} embedded />
      ) : (
        <MyLeaveSelfServiceView
          canApply={canApply}
          canEdit={canEdit}
          canDelete={canDelete}
          employeeId={employeeId}
          applyLeaveLookups={applyLeaveLookups}
          balances={balances}
          requests={requests}
          calendarMonth={calendarMonth}
          calendarYear={calendarYear}
          calendarLeaves={calendarLeaves}
          calendarHolidays={calendarHolidays}
          calendarContext={calendarContext}
          showPageHeading={false}
        />
      )}

      {applyLeaveLookups ? (
        <ApplyLeaveDialog
          open={applyOpen}
          onOpenChange={setApplyOpen}
          lookups={applyLeaveLookups}
          employeeId={employeeId}
          mode="self"
          onSubmitted={() => router.refresh()}
        />
      ) : null}

      {teamApplyLeaveLookups ? (
        <ApplyLeaveDialog
          open={teamApplyOpen}
          onOpenChange={setTeamApplyOpen}
          lookups={teamApplyLeaveLookups}
          mode="team"
          onSubmitted={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
