import { SystemDashboard } from "@/components/system-admin/system-dashboard";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { getSystemDashboardStats } from "@/lib/system-admin/queries";
import { createClient } from "@/lib/supabase/server";

export default async function SystemAdminDashboardPage() {
  const profile = await requireSuperAdminProfile();
  const supabase = await createClient();
  const stats = await getSystemDashboardStats(supabase, profile.employee.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organization-wide health, security, and operational metrics. Super Admin only.
        </p>
      </div>
      <SystemDashboard stats={stats} />
    </div>
  );
}
