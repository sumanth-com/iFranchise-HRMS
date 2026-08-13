import { EmployeeAssetsView } from "@/components/employee/assets/employee-assets-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getEmployeeAssetsData } from "@/lib/employee/services/employee-assets-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ManagerAssetsPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "asset.view",
  ]);
  const supabase = await createClient();
  const data = await getEmployeeAssetsData(supabase, profile);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View assets assigned to you and their status.
          </p>
        </div>
        <EmployeeAssetsView data={data} readOnly />
      </div>
    </div>
  );
}
