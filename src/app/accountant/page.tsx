import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmployeeDashboardView } from "@/components/employee/dashboard/employee-dashboard-view";
import { requireAccountantPortal } from "@/lib/accountant/permissions";
import { getEmployeeDashboardData } from "@/lib/employee/services/employee-dashboard-queries";
import { createClient } from "@/lib/supabase/server";

async function AccountantSelfServiceHomeContent() {
  const profile = await requireAccountantPortal();
  const supabase = await createClient();
  const data = await getEmployeeDashboardData(supabase, profile);

  return (
    <EmployeeDashboardView
      {...data}
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
