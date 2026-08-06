import { redirect } from "next/navigation";

import { SELF_LEAVE_ROUTES } from "@/lib/leave/constants";
import { hubListUrl } from "@/lib/dashboard/hub-paths";

type LeaveManagementPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeaveManagementPage({
  searchParams,
}: LeaveManagementPageProps) {
  const rawParams = await searchParams;
  const filters: Record<string, string | undefined> = {};

  Object.entries(rawParams).forEach(([key, value]) => {
    if (key === "tab" || typeof value !== "string") {
      return;
    }
    filters[key] = value;
  });

  redirect(hubListUrl(SELF_LEAVE_ROUTES.team, filters));
}
