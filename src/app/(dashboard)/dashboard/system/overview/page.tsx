import { SystemDashboardLive } from "@/components/system-admin/system-dashboard-live";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { getSystemDashboardStats } from "@/lib/system-admin/queries";
import { createClient } from "@/lib/supabase/server";

export default async function SuperAdminSystemDashboardPage() {
  const profile = await requireSuperAdminProfile();
  const supabase = await createClient();
  const stats = await getSystemDashboardStats(supabase, profile.employee.organizationId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      <SystemDashboardLive initialStats={stats} />
    </div>
  );
}
