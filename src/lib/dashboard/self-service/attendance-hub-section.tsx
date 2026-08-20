import { HrAttendanceHubView } from "@/components/attendance/hr-attendance-hub-view";
import { firstHubSearchParam } from "@/lib/dashboard/hub-page-utils";
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

const TEAM_ATTENDANCE_PERMISSIONS = [
  "attendance.view",
  "attendance.create",
  "attendance.edit",
  "attendance.approve",
] as const;

function firstString(value: string | string[] | undefined) {
  return firstHubSearchParam(value);
}

export async function AttendanceHubSection({
  section,
  searchParams,
}: {
  section: "my" | "team";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireServerPermission("attendance.view");
  const supabase = await createClient();
  const raw = await searchParams;
  const today = getTodayDateString();
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
    sortBy:
      section === "team" && !raw.sortBy ? "check_in_at" : raw.sortBy,
    sortOrder:
      section === "team" && !raw.sortOrder ? "desc" : raw.sortOrder,
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
        attendanceLookups: lookups ?? undefined,
        canCreate: hasPermission(profile.permissionCodes, "attendance.create"),
        canEdit: hasPermission(profile.permissionCodes, "attendance.edit"),
        canDelete: hasPermission(profile.permissionCodes, "attendance.delete"),
        canApproveCorrections: hasPermission(profile.permissionCodes, "attendance.approve"),
      }}
    />
  );
}
