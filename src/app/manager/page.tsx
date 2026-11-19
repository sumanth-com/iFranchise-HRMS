import { EmployeeDashboardPageBody } from "@/components/employee/dashboard/employee-dashboard-page-body";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function ManagerPortalPage() {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.manager);

  return (
    <EmployeeDashboardPageBody
      profile={profile}
      canManageAnnouncements={false}
      subtitle="Manager Portal"
      pairHolidayBirthday
      showImportantNotices
    />
  );
}
