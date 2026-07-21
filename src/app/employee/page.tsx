import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmployeeDashboardView } from "@/components/employee/dashboard/employee-dashboard-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getEmployeeDashboardData } from "@/lib/employee/services/employee-dashboard-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

async function EmployeeDashboardContent() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "employee_profile.view",
  ]);
  const supabase = await createClient();
  const data = await getEmployeeDashboardData(supabase, profile);

  return <EmployeeDashboardView {...data} />;
}

export default function EmployeeDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EmployeeDashboardContent />
    </Suspense>
  );
}
