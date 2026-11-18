import { redirect } from "next/navigation";
import { leaveWorkspaceUrl } from "@/lib/attendance/attendance-leave-navigation";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export default async function SuperAdminLeavePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSuperAdminProfile();
  redirect(leaveWorkspaceUrl(SYSTEM_ADMIN_ROUTES.attendance, await searchParams));
}
