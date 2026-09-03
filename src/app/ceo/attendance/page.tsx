import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { CeoTeamAttendanceView } from "@/components/ceo/attendance/ceo-team-attendance-view";
import { getCeoTeamAttendancePageData } from "@/lib/ceo/actions/ceo-attendance-actions";
import { attendanceListParamsSchema } from "@/lib/validations/attendance";

type CeoAttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

async function CeoAttendanceContent({ searchParams }: CeoAttendancePageProps) {
  const rawParams = await searchParams;
  const parsed = attendanceListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize),
    search: firstString(rawParams.search),
    sortBy: firstString(rawParams.sortBy),
    sortOrder: firstString(rawParams.sortOrder),
    dateFrom: firstString(rawParams.dateFrom),
    dateTo: firstString(rawParams.dateTo),
    branchId: firstString(rawParams.branchId),
    departmentId: firstString(rawParams.departmentId),
    attendanceStatus: firstString(rawParams.attendanceStatus),
    employeeId: firstString(rawParams.employeeId),
  });

  const data = await getCeoTeamAttendancePageData(parsed);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <CeoTeamAttendanceView
        summary={data.summary}
        records={data.records.data}
        total={data.records.total}
        page={data.records.page}
        pageSize={data.records.pageSize}
        search={parsed.search ?? ""}
        dateFrom={parsed.dateFrom}
        dateTo={parsed.dateTo}
        today={data.today}
        departmentId={parsed.departmentId}
        attendanceStatus={parsed.attendanceStatus}
        employeeId={parsed.employeeId}
        departments={data.lookups.departments}
        employees={data.lookups.employees}
        attendanceLookups={data.lookups}
        historyCounts={data.records.historyCounts}
      />
    </div>
  );
}

export default function CeoAttendancePage({ searchParams }: CeoAttendancePageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CeoAttendanceContent searchParams={searchParams} />
    </Suspense>
  );
}
