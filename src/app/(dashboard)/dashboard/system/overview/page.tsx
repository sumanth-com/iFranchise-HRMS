import { Suspense, cache } from "react";

import { ModulePageSkeleton } from "@/components/layout/module-page-skeleton";
import { SystemDashboardLive } from "@/components/system-admin/system-dashboard-live";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { getSystemDashboardStats } from "@/lib/system-admin/queries";
import { createClient } from "@/lib/supabase/server";

const loadSystemDashboard = cache(async () => {
  const profile = await requireSuperAdminProfile();
  const supabase = await createClient();
  const stats = await getSystemDashboardStats(
    supabase,
    profile.employee.organizationId,
  );
  return stats;
});

async function SystemDashboardContent() {
  const stats = await loadSystemDashboard();
  return <SystemDashboardLive initialStats={stats} />;
}

export default function SuperAdminSystemDashboardPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      <Suspense fallback={<ModulePageSkeleton />}>
        <SystemDashboardContent />
      </Suspense>
    </div>
  );
}
