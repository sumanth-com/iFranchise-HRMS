import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerTeamAttendanceView } from "@/components/manager/attendance/manager-team-attendance-view";
import { getManagerTeamAttendancePageData } from "@/lib/manager/actions/manager-attendance-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { requireServerPermission } from "@/lib/permissions/server";
import { teamAttendanceListParamsSchema } from "@/lib/validations/manager-attendance";

type ManagerTeamAttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ManagerTeamAttendancePage({
  searchParams,
}: ManagerTeamAttendancePageProps) {
  await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const rawParams = await searchParams;
  const today = getTodayDateString();

  const teamParams = teamAttendanceListParamsSchema.parse({
    page: firstString(rawParams.page),
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

  const teamData = await getManagerTeamAttendancePageData(teamParams);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
        <ManagerTeamAttendanceView
          summary={teamData.summary}
          records={teamData.records.data}
          total={teamData.records.total}
          page={teamData.records.page}
          pageSize={teamData.records.pageSize}
          search={teamParams.search ?? ""}
          dateFrom={teamParams.dateFrom}
          dateTo={teamParams.dateTo}
          today={today}
          departmentId={teamParams.departmentId}
          attendanceStatus={teamParams.attendanceStatus}
          employeeId={teamParams.employeeId}
          departments={teamData.lookups.departments}
          employees={teamData.lookups.teamMembers}
        />
      </div>
    </Suspense>
  );
}
