import { redirect } from "next/navigation";

import { SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { hubListUrl } from "@/lib/dashboard/hub-paths";

type AttendanceManagementPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AttendanceManagementPage({
  searchParams,
}: AttendanceManagementPageProps) {
  const rawParams = await searchParams;
  const filters: Record<string, string | undefined> = {};

  Object.entries(rawParams).forEach(([key, value]) => {
    if (key === "tab" || typeof value !== "string") {
      return;
    }
    filters[key] = value;
  });

  redirect(hubListUrl(SELF_ATTENDANCE_ROUTES.team, filters));
}
