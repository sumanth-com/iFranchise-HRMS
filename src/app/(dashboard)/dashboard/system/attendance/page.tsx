import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmployeeAttendanceView } from "@/components/employee/attendance/employee-attendance-view";
import { getManagerProfilePageData } from "@/lib/manager/services/manager-self-attendance-service";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { createClient } from "@/lib/supabase/server";
import { managerProfilePageParamsSchema } from "@/lib/validations/manager-self-attendance";

type SuperAdminAttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function SuperAdminAttendancePage({
  searchParams,
}: SuperAdminAttendancePageProps) {
  const profile = await requireSuperAdminProfile();
  const supabase = await createClient();
  const rawParams = await searchParams;

  const selfParams = managerProfilePageParamsSchema.parse({
    month: firstString(rawParams.month),
    year: firstString(rawParams.year),
    date: firstString(rawParams.date),
    status: firstString(rawParams.status),
    searchDate: firstString(rawParams.searchDate),
    page: firstString(rawParams.page),
  });

  const selfData = await getManagerProfilePageData(supabase, profile, selfParams);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <EmployeeAttendanceView
        data={selfData}
        status={selfParams.status}
        searchDate={selfParams.searchDate}
        basePath={SYSTEM_ADMIN_ROUTES.attendance}
      />
    </Suspense>
  );
}
