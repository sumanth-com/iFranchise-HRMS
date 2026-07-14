import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerAttendanceView } from "@/components/manager/attendance/manager-attendance-view";
import { getManagerTeamAttendancePageData } from "@/lib/manager/actions/manager-attendance-actions";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { requireServerPermission } from "@/lib/permissions/server";
import { teamAttendanceListParamsSchema } from "@/lib/validations/manager-attendance";

type ManagerAttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ManagerAttendancePage({
  searchParams,
}: ManagerAttendancePageProps) {
  await requireServerPermission("portal.manager.access");
  const rawParams = await searchParams;
  const today = getTodayDateString();

  const parsed = teamAttendanceListParamsSchema.parse({
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

  const data = await getManagerTeamAttendancePageData(parsed);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ManagerAttendanceView {...data} initialFilters={parsed} today={today} />
    </Suspense>
  );
}
