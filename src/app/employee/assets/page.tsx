import { EmployeeAssetsView } from "@/components/employee/assets/employee-assets-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getEmployeeAssetsData } from "@/lib/employee/services/employee-assets-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeAssetsPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "asset.view",
  ]);
  const supabase = await createClient();
  const data = await getEmployeeAssetsData(supabase, profile);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View, manage and track all company assets assigned to you throughout your
            employment.
          </p>
        </div>
        <EmployeeAssetsView data={data} />
      </div>
    </div>
  );
}
