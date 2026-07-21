import { RolesSearch } from "@/components/roles/roles-search";
import { RolesSummaryCards } from "@/components/roles/roles-summary-cards";
import { ROLE_VIEW_PERMISSIONS } from "@/lib/roles/constants";
import { getRolesDashboardStats } from "@/lib/roles/services/role-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function RolesDashboardPage() {
  const profile = await requireServerAnyPermission([...ROLE_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const stats = await getRolesDashboardStats(supabase, profile.employee.organizationId);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles & Access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage roles, permissions, user assignments, and access control across the HRMS.
        </p>
      </div>
      <RolesSummaryCards stats={stats} />
      {stats.recentlyUpdated.length > 0 ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold">Recently Updated Roles</h3>
          <ul className="mt-3 space-y-2">
            {stats.recentlyUpdated.map((role) => (
              <li key={role.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{role.name}</span>
                <span className="text-muted-foreground">
                  {role.userCount} users · {role.permissionCount} permissions
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <RolesSearch />
    </>
  );
}
