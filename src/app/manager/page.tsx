import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmployeeDashboardView } from "@/components/employee/dashboard/employee-dashboard-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getEmployeeDashboardData } from "@/lib/employee/services/employee-dashboard-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

async function ManagerSelfServiceHomeContent() {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const supabase = await createClient();
  const data = await getEmployeeDashboardData(supabase, profile);

  return <EmployeeDashboardView {...data} subtitle="Manager Portal" />;
}

export default function ManagerPortalPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ManagerSelfServiceHomeContent />
    </Suspense>
  );
}
