import { EmployeeAssetsView } from "@/components/employee/assets/employee-assets-view";
import { getEmployeeAssetsData } from "@/lib/employee/services/employee-assets-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function AssetsSelfServicePage() {
  const profile = await requireServerPermission("asset.view");
  const supabase = await createClient();
  const data = await getEmployeeAssetsData(supabase, profile);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and track company assets assigned to you.
        </p>
      </div>
      <EmployeeAssetsView data={data} />
    </div>
  );
}
