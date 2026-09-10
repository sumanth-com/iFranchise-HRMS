import { Suspense } from "react";

import { EmployeeAttendanceView } from "@/components/employee/attendance/employee-attendance-view";
import { ModulePageSkeleton } from "@/components/layout/module-page-skeleton";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
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

  const params = managerProfilePageParamsSchema.parse({
    month: typeof raw.month === "string" ? raw.month : undefined,
    year: typeof raw.year === "string" ? raw.year : undefined,
    date: typeof raw.date === "string" ? raw.date : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    searchDate: typeof raw.searchDate === "string" ? raw.searchDate : undefined,
    page: typeof raw.page === "string" ? raw.page : undefined,
  });

  const data = await getManagerProfilePageData(supabase, profile, params);

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
    <Suspense fallback={<ModulePageSkeleton />}>
      <AccountantAttendanceContent searchParams={searchParams} />
    </Suspense>
  );
}
