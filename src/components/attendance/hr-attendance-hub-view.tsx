"use client";

import { useState } from "react";

import { Button } from "@/components/common/button";
import { HrTeamAttendanceView } from "@/components/attendance/hr-team-attendance-view";
import { EmployeeAttendanceView } from "@/components/employee/attendance/employee-attendance-view";
import { SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import type { AttendanceStatus } from "@/types/attendance";
import type { AttendanceListItem, AttendanceSummary } from "@/types/attendance";
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
  const sectionDefault =
    initialSection === "team" && canViewTeam ? "team" : "my";
  const [section, setSection] = useState<AttendanceSection>(sectionDefault);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Track your own attendance and manage workforce attendance across the organization.
          </p>
        </div>
        {canViewTeam ? (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
            <Button
              size="sm"
              variant={section === "my" ? "default" : "ghost"}
              onClick={() => setSection("my")}
            >
              My Attendance
            </Button>
            <Button
              size="sm"
              variant={section === "team" ? "default" : "ghost"}
              onClick={() => setSection("team")}
            >
              Team Attendance
            </Button>
          </div>
        ) : null}
      </div>

      {section === "my" || !canViewTeam ? (
        <EmployeeAttendanceView
          data={selfAttendance.data}
          status={selfAttendance.status}
          searchDate={selfAttendance.searchDate}
          basePath={SELF_ATTENDANCE_ROUTES.list}
          tabQuery="my"
          padded={false}
          showPageHeading={false}
        />
      ) : (
        <HrTeamAttendanceView {...teamAttendance} embedded />
      )}
    </div>
  );
}
