import { SystemDashboardLive } from "@/components/system-admin/system-admin-modules";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { getSystemDashboardStats } from "@/lib/system-admin/queries";
import { createClient } from "@/lib/supabase/server";

export default async function SystemAdminDashboardPage() {
  const profile = await requireSuperAdminProfile();
  const supabase = await createClient();
  const stats = await getSystemDashboardStats(supabase, profile.employee.organizationId);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SystemDashboardLive initialStats={stats} />
    </div>
  );
}
