import { Suspense } from "react";

import { SoftLoadError } from "@/components/common/soft-load-error";
import { EmployeeAttendanceView } from "@/components/employee/attendance/employee-attendance-view";
import { ModulePageSkeleton } from "@/components/layout/module-page-skeleton";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
import { attendancePageParamsInput } from "@/lib/attendance/attendance-leave-navigation";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { safeServerCallWithError } from "@/lib/errors/safe-server";
import { getAttendanceLeaveData } from "@/lib/dashboard/self-service/attendance-leave-data";
import { getManagerProfilePageData } from "@/lib/manager/services/manager-self-attendance-service";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { managerProfilePageParamsSchema } from "@/lib/validations/manager-self-attendance";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function AccountantAttendanceContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.accountant,
    "attendance.view",
  ]);
  const supabase = await createClient();
  const raw = await searchParams;

  const parsed = managerProfilePageParamsSchema.safeParse(
    attendancePageParamsInput(raw),
  );

  if (!parsed.success) {
    console.error("[accountant-attendance] invalid search params", parsed.error);
    return <SoftLoadError variant="page" />;
  }

  const params = parsed.data;
  const [{ data, error }, leave] = await Promise.all([
    safeServerCallWithError(
      () => getManagerProfilePageData(supabase, profile, params),
      null,
      "[accountant-attendance] page load",
    ),
    getAttendanceLeaveData(
      supabase,
      profile,
      "accountant",
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
      basePath={ACCOUNTANT_ROUTES.attendance}
      leave={leave ? { ...leave, policyHref: ACCOUNTANT_ROUTES.leavePolicy } : null}
      status={params.status}
      searchDate={params.searchDate}
      policyHref={ACCOUNTANT_ROUTES.attendancePolicy}
    />
  );
}

export default function AccountantAttendancePage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<ModulePageSkeleton />}>
      <AccountantAttendanceContent searchParams={searchParams} />
    </Suspense>
  );
}
