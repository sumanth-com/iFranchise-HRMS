import { Suspense } from "react";

import { DashboardOpeningState } from "@/components/dashboard/dashboard-opening-state";
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
    <Suspense fallback={<DashboardOpeningState />}>
      <SelfServiceHomeContent />
    </Suspense>
  );
}
