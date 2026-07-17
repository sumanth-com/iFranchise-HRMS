import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmployeeDashboardView } from "@/components/employee/dashboard/employee-dashboard-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getEmployeeDashboardData } from "@/lib/employee/services/employee-dashboard-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeDashboardPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "employee_profile.view",
  ]);
  const supabase = await createClient();
  const data = await getEmployeeDashboardData(supabase, profile);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <EmployeeDashboardView {...data} />
    </Suspense>
  );
}
