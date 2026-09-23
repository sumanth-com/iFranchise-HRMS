import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmployeeDashboardPageBody } from "@/components/employee/dashboard/employee-dashboard-page-body";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";

async function SelfServiceHomeContent() {
  const profile = await requireAuthenticatedProfile();

  return (
    <EmployeeDashboardPageBody
      profile={profile}
      subtitle="HR Portal"
      pairHolidayBirthday
      showImportantNotices
    />
  );
}

export default function HrSelfServiceHomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SelfServiceHomeContent />
    </Suspense>
  );
}
