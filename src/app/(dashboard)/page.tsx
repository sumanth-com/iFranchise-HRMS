import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmployeeDashboardView } from "@/components/employee/dashboard/employee-dashboard-view";
import { getEmployeeDashboardData } from "@/lib/employee/services/employee-dashboard-queries";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

async function SelfServiceHomeContent() {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();
  const data = await getEmployeeDashboardData(supabase, profile);

  return (
    <EmployeeDashboardView {...data} showPageHeading={false} />
  );
}

export default function HrSelfServiceHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <SelfServiceHomeContent />
    </Suspense>
  );
}
