import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmployeeDashboardPageBody } from "@/components/employee/dashboard/employee-dashboard-page-body";
import { requireAccountantPortal } from "@/lib/accountant/permissions";

async function AccountantSelfServiceHomeContent() {
  const profile = await requireAccountantPortal();

  return (
    <EmployeeDashboardPageBody
      profile={profile}
      canManageAnnouncements={false}
      subtitle="Accountant Portal"
      pairHolidayBirthday
      showImportantNotices
    />
  );
}

export default function AccountantPortalPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AccountantSelfServiceHomeContent />
    </Suspense>
  );
}
