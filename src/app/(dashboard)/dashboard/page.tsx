import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmployeeDashboardView } from "@/components/employee/dashboard/employee-dashboard-view";
import { getEmployeeDashboardData } from "@/lib/employee/services/employee-dashboard-queries";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

async function SelfServiceHomeContent() {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();
  const data = await getEmployeeDashboardData(supabase, profile);

  return <EmployeeDashboardView {...data} subtitle="HR Portal" />;
}

export default function HrSelfServiceHomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SelfServiceHomeContent />
    </Suspense>
  );
}
