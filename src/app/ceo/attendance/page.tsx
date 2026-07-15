import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CeoAttendanceView } from "@/components/ceo/attendance/ceo-attendance-view";
import { getCeoAttendanceModuleData } from "@/lib/ceo/actions/ceo-attendance-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { requireServerPermission } from "@/lib/permissions/server";
import { ceoAttendanceListParamsSchema } from "@/lib/validations/ceo-attendance";

type CeoAttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CeoAttendancePage({
  searchParams,
}: CeoAttendancePageProps) {
  await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const rawParams = await searchParams;
  const today = getTodayDateString();
  const [year, month] = today.split("-");

  const parsed = ceoAttendanceListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize),
    search: firstString(rawParams.search),
    departmentId: firstString(rawParams.departmentId),
    managerId: firstString(rawParams.managerId),
    branchId: firstString(rawParams.branchId),
    employmentTypeId: firstString(rawParams.employmentTypeId),
    attendanceStatus: firstString(rawParams.attendanceStatus),
    month: firstString(rawParams.month) ?? month,
    year: firstString(rawParams.year) ?? year,
    dateFrom: firstString(rawParams.dateFrom),
    dateTo: firstString(rawParams.dateTo),
  });

  const data = await getCeoAttendanceModuleData(parsed);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoAttendanceView {...data} initialFilters={parsed} />
    </Suspense>
  );
}
