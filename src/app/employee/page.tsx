import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmployeeDashboardPageBody } from "@/components/employee/dashboard/employee-dashboard-page-body";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerAnyPermission } from "@/lib/permissions/server";

async function EmployeeDashboardContent() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "employee_profile.view",
  ]);

  return (
    <EmployeeDashboardPageBody
      profile={profile}
      canManageAnnouncements={false}
      subtitle="Employee Portal"
      pairHolidayBirthday
      showImportantNotices
    />
  );
}

export default function EmployeeDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EmployeeDashboardContent />
    </Suspense>
  );
}
