import { EmployeeAttendanceView } from "@/components/employee/attendance/employee-attendance-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getManagerProfilePageData } from "@/lib/manager/services/manager-self-attendance-service";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { managerProfilePageParamsSchema } from "@/lib/validations/manager-self-attendance";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmployeeAttendancePage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "attendance.view",
  ]);
  const supabase = await createClient();
  const raw = await searchParams;

  const params = managerProfilePageParamsSchema.parse({
    month: typeof raw.month === "string" ? raw.month : undefined,
    year: typeof raw.year === "string" ? raw.year : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    page: typeof raw.page === "string" ? raw.page : undefined,
  });

  const data = await getManagerProfilePageData(supabase, profile, params);

  return <EmployeeAttendanceView data={data} />;
}
