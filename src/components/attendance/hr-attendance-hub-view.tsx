"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import { buttonVariants } from "@/components/common/button";
import { HrTeamAttendanceView } from "@/components/attendance/hr-team-attendance-view";
import { EmployeeAttendanceView } from "@/components/employee/attendance/employee-attendance-view";
import { SELF_ATTENDANCE_ROUTES, ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/attendance";
import type { AttendanceListItem, AttendanceLookups, AttendanceSummary } from "@/types/attendance";
import type { LookupOption } from "@/types/employee";
import type { ManagerProfilePageData } from "@/types/manager-self-attendance";

type AttendanceSection = "my" | "team";

type TeamAttendanceData = {
  summary: AttendanceSummary;
  records: AttendanceListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  dateFrom?: string;
  dateTo?: string;
  today: string;
  departmentId?: string;
  attendanceStatus?: string;
  employeeId?: string;
  departments: LookupOption[];
  employees: LookupOption[];
  attendanceLookups?: AttendanceLookups;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type Props = {
  initialSection?: AttendanceSection;
  canViewTeam: boolean;
  selfAttendance: {
    data: ManagerProfilePageData;
    status?: AttendanceStatus;
    searchDate?: string;
  };
  teamAttendance: TeamAttendanceData;
};

export function HrAttendanceHubView({
  initialSection = "my",
  canViewTeam,
  selfAttendance,
  teamAttendance,
}: Props) {
  const section = initialSection === "team" && canViewTeam ? "team" : "my";
  const isTeamView = section === "team";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isTeamView ? "Team Attendance" : "Attendance"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isTeamView
              ? "Track daily attendance records, manual entries, and workforce presence across the organization."
              : "Mark attendance, view your calendar, and track your working hours."}
          </p>
        </div>
        {!isTeamView ? (
          <Link
            href={ATTENDANCE_ROUTES.policy}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <FileText className="size-4" />
            Attendance Policy
          </Link>
        ) : null}
      </div>

      {isTeamView ? (
        <HrTeamAttendanceView {...teamAttendance} embedded />
      ) : (
        <EmployeeAttendanceView
          data={selfAttendance.data}
          status={selfAttendance.status}
          searchDate={selfAttendance.searchDate}
          basePath={SELF_ATTENDANCE_ROUTES.list}
          padded={false}
          showPageHeading={false}
          showPolicyLink={false}
        />
      )}
    </div>
  );
}
