import { Suspense } from "react";

import { SoftLoadError } from "@/components/common/soft-load-error";
import { EmployeeAttendanceView } from "@/components/employee/attendance/employee-attendance-view";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { safeServerCallWithError } from "@/lib/errors/safe-server";
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

  const parsed = managerProfilePageParamsSchema.safeParse({
    month: typeof raw.month === "string" ? raw.month : undefined,
    year: typeof raw.year === "string" ? raw.year : undefined,
    date: typeof raw.date === "string" ? raw.date : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    searchDate: typeof raw.searchDate === "string" ? raw.searchDate : undefined,
    page: typeof raw.page === "string" ? raw.page : undefined,
  });

  if (!parsed.success) {
    console.error("[accountant-attendance] invalid search params", parsed.error);
    return <SoftLoadError variant="page" />;
  }

  const params = parsed.data;
  const { data, error } = await safeServerCallWithError(
    () => getManagerProfilePageData(supabase, profile, params),
    null,
    "[accountant-attendance] page load",
  );

  if (error || !data) {
    return <SoftLoadError variant="page" />;
  }

  return (
    <EmployeeAttendanceView
      data={data}
      status={params.status}
      searchDate={params.searchDate}
      policyHref={ACCOUNTANT_ROUTES.attendancePolicy}
    />
  );
}

export default function AccountantAttendancePage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={null}>
      <AccountantAttendanceContent searchParams={searchParams} />
    </Suspense>
  );
}
