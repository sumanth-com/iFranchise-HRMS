import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmployeeAttendanceView } from "@/components/employee/attendance/employee-attendance-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { hubListUrl } from "@/lib/dashboard/hub-paths";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { getManagerProfilePageData } from "@/lib/manager/services/manager-self-attendance-service";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { managerProfilePageParamsSchema } from "@/lib/validations/manager-self-attendance";

type ManagerAttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function teamRedirect(
  raw: Record<string, string | string[] | undefined>,
): string | null {
  const tab = firstString(raw.tab);
  const employeeId = firstString(raw.employeeId);
  if (tab !== "team" && !employeeId) return null;

  const filters: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === "tab" || typeof value !== "string" || !value) continue;
    filters[key] = value;
  }
  return hubListUrl(MANAGER_ROUTES.attendanceTeam, filters);
}

export default async function ManagerAttendancePage({
  searchParams,
}: ManagerAttendancePageProps) {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const supabase = await createClient();
  const rawParams = await searchParams;
  const legacy = teamRedirect(rawParams);
  if (legacy) redirect(legacy);

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
        basePath={MANAGER_ROUTES.attendance}
      />
    </Suspense>
  );
}
