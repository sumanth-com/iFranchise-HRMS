"use client";

import { useState } from "react";

import { Button } from "@/components/common/button";
import { EmployeeAttendanceView } from "@/components/employee/attendance/employee-attendance-view";
import { ManagerAttendanceView } from "@/components/manager/attendance/manager-attendance-view";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import type { AttendanceStatus } from "@/types/attendance";
import type { ManagerTeamAttendancePageData, TeamAttendanceListParams } from "@/types/manager-attendance";
import type { ManagerProfilePageData } from "@/types/manager-self-attendance";

type AttendanceSection = "my" | "team";

type Props = {
  initialSection?: AttendanceSection;
  selfAttendance: {
    data: ManagerProfilePageData;
    status?: AttendanceStatus;
    searchDate?: string;
  };
  teamAttendance: ManagerTeamAttendancePageData & {
    initialFilters: TeamAttendanceListParams;
    today: string;
  };
};

export function ManagerAttendanceHubView({
  initialSection = "my",
  selfAttendance,
  teamAttendance,
}: Props) {
  const [section, setSection] = useState<AttendanceSection>(initialSection);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Track your own attendance and manage your team&apos;s attendance.
          </p>
        </div>
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
      </div>

      {section === "my" ? (
        <EmployeeAttendanceView
          data={selfAttendance.data}
          status={selfAttendance.status}
          searchDate={selfAttendance.searchDate}
          basePath={MANAGER_ROUTES.attendance}
          tabQuery="my"
          padded={false}
          showPageHeading={false}
        />
      ) : (
        <ManagerAttendanceView {...teamAttendance} embedded />
      )}
    </div>
  );
}
