import { AssetsReportsView } from "@/components/assets/assets-reports-view";
import { getAssetsReports } from "@/lib/assets/services/asset-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function AssetReportsPage() {
  const profile = await requireServerPermission("asset.view");
  const supabase = await createClient();
  const report = await getAssetsReports(supabase, profile);

  return <AssetsReportsView report={report} />;
}
