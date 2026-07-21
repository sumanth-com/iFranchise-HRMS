import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerAttendanceHubView } from "@/components/manager/attendance/manager-attendance-hub-view";
import { getManagerTeamAttendancePageData } from "@/lib/manager/actions/manager-attendance-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { getManagerProfilePageData } from "@/lib/manager/services/manager-self-attendance-service";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { teamAttendanceListParamsSchema } from "@/lib/validations/manager-attendance";
import { managerProfilePageParamsSchema } from "@/lib/validations/manager-self-attendance";

type ManagerAttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function parseSection(value: string | undefined): "my" | "team" {
  return value === "team" ? "team" : "my";
}

export default async function ManagerAttendancePage({
  searchParams,
}: ManagerAttendancePageProps) {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const supabase = await createClient();
  const rawParams = await searchParams;
  const today = getTodayDateString();
  const section = parseSection(firstString(rawParams.tab));

  const selfParams = managerProfilePageParamsSchema.parse({
    month: firstString(rawParams.month),
    year: firstString(rawParams.year),
    date: firstString(rawParams.date),
    status: firstString(rawParams.status),
    searchDate: firstString(rawParams.searchDate),
    page: section === "my" ? firstString(rawParams.page) : undefined,
  });

  const teamParams = teamAttendanceListParamsSchema.parse({
    page: section === "team" ? firstString(rawParams.page) : undefined,
    pageSize: firstString(rawParams.pageSize),
    search: firstString(rawParams.search),
    sortBy: firstString(rawParams.sortBy),
    sortOrder: firstString(rawParams.sortOrder),
    dateFrom: firstString(rawParams.dateFrom),
    dateTo: firstString(rawParams.dateTo),
    departmentId: firstString(rawParams.departmentId),
    employmentTypeId: firstString(rawParams.employmentTypeId),
    attendanceStatus: firstString(rawParams.attendanceStatus),
    employeeId: firstString(rawParams.employeeId),
  });

  const [selfData, teamData] = await Promise.all([
    getManagerProfilePageData(supabase, profile, selfParams),
    getManagerTeamAttendancePageData(teamParams),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ManagerAttendanceHubView
        initialSection={section}
        selfAttendance={{
          data: selfData,
          status: selfParams.status,
          searchDate: selfParams.searchDate,
        }}
        teamAttendance={{
          ...teamData,
          initialFilters: teamParams,
          today,
        }}
      />
    </Suspense>
  );
}
