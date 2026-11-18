import { Suspense } from "react";

import { DashboardOpeningState } from "@/components/dashboard/dashboard-opening-state";
import { EmployeeDashboardPageBody } from "@/components/employee/dashboard/employee-dashboard-page-body";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";

async function SuperAdminSelfServiceHomeContent() {
  const profile = await requireSuperAdminProfile();

  return (
    <EmployeeDashboardPageBody
      profile={profile}
      subtitle="Super Admin Portal"
      pairHolidayBirthday
      showImportantNotices
      // Team Updates editing is CEO/HR only — Super Admin can view, not edit.
      canManageAnnouncements={false}
    />
  );
}

export default function SuperAdminPortalPage() {
  return (
    <Suspense fallback={<DashboardOpeningState />}>
      <SuperAdminSelfServiceHomeContent />
    </Suspense>
  );
}
