import { Suspense } from "react";

import { SoftLoadError } from "@/components/common/soft-load-error";
import { EmployeeAttendanceView } from "@/components/employee/attendance/employee-attendance-view";
import { ModulePageSkeleton } from "@/components/layout/module-page-skeleton";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { safeServerCallWithError } from "@/lib/errors/safe-server";
import { getAttendanceLeaveData } from "@/lib/dashboard/self-service/attendance-leave-data";
import { attendancePageParamsInput } from "@/lib/attendance/attendance-leave-navigation";
import { getManagerProfilePageData } from "@/lib/manager/services/manager-self-attendance-service";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { managerProfilePageParamsSchema } from "@/lib/validations/manager-self-attendance";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function EmployeeAttendanceContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "attendance.view",
  ]);
  const supabase = await createClient();
  const raw = await searchParams;

  const parsed = managerProfilePageParamsSchema.safeParse(
    attendancePageParamsInput(raw),
  );

  if (!parsed.success) {
    console.error("[employee-attendance] invalid search params", parsed.error);
    return <SoftLoadError variant="page" />;
  }

  const params = parsed.data;
  const [{ data, error }, leave] = await Promise.all([
    safeServerCallWithError(
      () => getManagerProfilePageData(supabase, profile, params),
      null,
      "[employee-attendance] page load",
    ),
    getAttendanceLeaveData(
      supabase,
      profile,
      "employee",
      params.month ?? new Date().getMonth() + 1,
      params.year ?? new Date().getFullYear(),
    ),
  ]);

  if (error || !data) {
    return <SoftLoadError variant="page" />;
  }

  return (
    <EmployeeAttendanceView
      data={data}
      basePath={EMPLOYEE_ROUTES.attendance}
      leave={leave ? { ...leave, policyHref: EMPLOYEE_ROUTES.leavePolicy } : null}
      status={params.status}
      searchDate={params.searchDate}
      policyHref={EMPLOYEE_ROUTES.attendancePolicy}
    />
  );
}

export default function EmployeeAttendancePage({ searchParams }: PageProps) {
  // Soft-nav: keep prior content when possible; null avoids a full-page skeleton.
  return (
    <Suspense fallback={<ModulePageSkeleton />}>
      <EmployeeAttendanceContent searchParams={searchParams} />
    </Suspense>
  );
}
