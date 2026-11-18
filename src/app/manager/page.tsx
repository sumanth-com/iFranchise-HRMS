import { Suspense } from "react";

import { DashboardOpeningState } from "@/components/dashboard/dashboard-opening-state";
import { EmployeeDashboardPageBody } from "@/components/employee/dashboard/employee-dashboard-page-body";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";

async function ManagerSelfServiceHomeContent() {
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

export default function ManagerPortalPage() {
  return (
    <Suspense fallback={<DashboardOpeningState />}>
      <ManagerSelfServiceHomeContent />
    </Suspense>
  );
}
