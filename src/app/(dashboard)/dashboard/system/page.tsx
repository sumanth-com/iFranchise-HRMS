import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmployeeDashboardView } from "@/components/employee/dashboard/employee-dashboard-view";
import { getEmployeeDashboardData } from "@/lib/employee/services/employee-dashboard-queries";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { createClient } from "@/lib/supabase/server";

async function SuperAdminSelfServiceHomeContent() {
  const profile = await requireSuperAdminProfile();
  const supabase = await createClient();
  const data = await getEmployeeDashboardData(supabase, profile);

  return (
    <EmployeeDashboardView
      {...data}
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
    <Suspense fallback={<DashboardSkeleton />}>
      <SuperAdminSelfServiceHomeContent />
    </Suspense>
  );
}
