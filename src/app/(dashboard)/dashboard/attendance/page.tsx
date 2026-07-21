import { Suspense } from "react";

import { HrAttendanceHubView } from "@/components/attendance/hr-attendance-hub-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  getAttendanceLookups,
  getAttendanceSummary,
  listAttendance,
} from "@/lib/attendance/services/attendance-queries";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { getManagerProfilePageData } from "@/lib/manager/services/manager-self-attendance-service";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasAnyPermission, hasPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";
import { attendanceListParamsSchema } from "@/lib/validations/attendance";
import { managerProfilePageParamsSchema } from "@/lib/validations/manager-self-attendance";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TEAM_ATTENDANCE_PERMISSIONS = [
  "attendance.view",
  "attendance.create",
  "attendance.edit",
  "attendance.approve",
] as const;

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function parseSection(value: string | undefined): "my" | "team" {
  return value === "team" ? "team" : "my";
}

export default async function AttendanceSelfServicePage({ searchParams }: PageProps) {
  const profile = await requireServerPermission("attendance.view");
  const supabase = await createClient();
  const raw = await searchParams;
  const today = getTodayDateString();
  const section = parseSection(firstString(raw.tab));
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [
    ...TEAM_ATTENDANCE_PERMISSIONS,
  ]);

  const selfParams = managerProfilePageParamsSchema.parse({
    month: firstString(raw.month),
    year: firstString(raw.year),
    date: firstString(raw.date),
    status: firstString(raw.status),
    searchDate: firstString(raw.searchDate),
    page: section === "my" ? firstString(raw.page) : undefined,
  });

  const teamParams = attendanceListParamsSchema.parse({
    page: section === "team" ? raw.page : undefined,
    pageSize: raw.pageSize,
    search: firstString(raw.search),
    sortBy: raw.sortBy,
    sortOrder: raw.sortOrder,
    dateFrom:
      typeof raw.dateFrom === "string" && raw.dateFrom.length > 0
        ? raw.dateFrom
        : undefined,
    dateTo:
      typeof raw.dateTo === "string" && raw.dateTo.length > 0 ? raw.dateTo : undefined,
    branchId: raw.branchId,
    departmentId: raw.departmentId,
    attendanceStatus: raw.attendanceStatus,
    employeeId: raw.employeeId,
  });

  const [selfData, teamResult, lookups, summary] = await Promise.all([
    getManagerProfilePageData(supabase, profile, selfParams),
    canViewTeam ? listAttendance(supabase, profile, teamParams) : Promise.resolve(null),
    canViewTeam
      ? getAttendanceLookups(supabase, profile.employee.organizationId)
      : Promise.resolve(null),
    canViewTeam
      ? getAttendanceSummary(supabase, profile, teamParams.dateFrom, teamParams.dateTo)
      : Promise.resolve(null),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <HrAttendanceHubView
        initialSection={section}
        canViewTeam={canViewTeam}
        selfAttendance={{
          data: selfData,
          status: selfParams.status,
          searchDate: selfParams.searchDate,
        }}
        teamAttendance={{
          summary: summary ?? {
            date: today,
            presentToday: 0,
            absentToday: 0,
            lateToday: 0,
            halfDayToday: 0,
            onLeaveToday: 0,
            totalEmployees: 0,
          },
          records: teamResult?.data ?? [],
          total: teamResult?.total ?? 0,
          page: teamResult?.page ?? teamParams.page,
          pageSize: teamResult?.pageSize ?? teamParams.pageSize,
          search: teamParams.search ?? "",
          dateFrom: teamParams.dateFrom,
          dateTo: teamParams.dateTo,
          today,
          departmentId: teamParams.departmentId,
          attendanceStatus: teamParams.attendanceStatus,
          employeeId: teamParams.employeeId,
          departments: lookups?.departments ?? [],
          employees: lookups?.employees ?? [],
          canCreate: hasPermission(profile.permissionCodes, "attendance.create"),
          canEdit: hasPermission(profile.permissionCodes, "attendance.edit"),
          canDelete: hasPermission(profile.permissionCodes, "attendance.delete"),
        }}
      />
    </Suspense>
  );
}
