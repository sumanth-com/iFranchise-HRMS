import {
  AssetsDashboardPanels,
  AssetsSummaryCards,
} from "@/components/assets/assets-dashboard-panels";
import { getAssetsSummary } from "@/lib/assets/services/asset-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function AssetsDashboardPage() {
  const profile = await requireServerPermission("asset.view");
  const supabase = await createClient();
  const summary = await getAssetsSummary(supabase, profile);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track inventory, assignments, maintenance, warranties, and vendors.
        </p>
      </div>
      <AssetsSummaryCards summary={summary} />
      <AssetsDashboardPanels summary={summary} />
    </>
  );
}
