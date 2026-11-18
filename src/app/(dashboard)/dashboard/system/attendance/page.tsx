import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmployeeAttendanceView } from "@/components/employee/attendance/employee-attendance-view";
import { attendancePageParamsInput } from "@/lib/attendance/attendance-leave-navigation";
import { getAttendanceLeaveData } from "@/lib/dashboard/self-service/attendance-leave-data";
import { getManagerProfilePageData } from "@/lib/manager/services/manager-self-attendance-service";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { createClient } from "@/lib/supabase/server";
import { managerProfilePageParamsSchema } from "@/lib/validations/manager-self-attendance";

type SuperAdminAttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuperAdminAttendancePage({
  searchParams,
}: SuperAdminAttendancePageProps) {
  const profile = await requireSuperAdminProfile();
  const supabase = await createClient();
  const rawParams = await searchParams;

  const selfParams = managerProfilePageParamsSchema.parse(
    attendancePageParamsInput(rawParams),
  );

  const [selfData, leave] = await Promise.all([
    getManagerProfilePageData(supabase, profile, selfParams),
    getAttendanceLeaveData(
      supabase,
      profile,
      "system",
      selfParams.month ?? new Date().getMonth() + 1,
      selfParams.year ?? new Date().getFullYear(),
    ),
  ]);

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
        leave={leave}
        status={selfParams.status}
        searchDate={selfParams.searchDate}
        basePath={SYSTEM_ADMIN_ROUTES.attendance}
      />
    </Suspense>
  );
}
