import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { MaintenanceManagement } from "@/components/assets/maintenance-management";
import {
  getAssetsLookups,
  listMaintenance,
} from "@/lib/assets/services/asset-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { maintenanceListParamsSchema } from "@/lib/validations/assets";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AssetMaintenancePage({ searchParams }: Props) {
  const profile = await requireServerPermission("asset.view");
  const supabase = await createClient();
  const raw = await searchParams;

  const params = maintenanceListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    assetId: typeof raw.assetId === "string" ? raw.assetId : undefined,
    maintenanceStatus:
      typeof raw.maintenanceStatus === "string" ? raw.maintenanceStatus : undefined,
  });

  const [result, lookups] = await Promise.all([
    listMaintenance(supabase, profile, params),
    getAssetsLookups(supabase, profile),
  ]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MaintenanceManagement
        result={result}
        lookups={lookups}
        permissionCodes={profile.permissionCodes}
      />
    </Suspense>
  );
}
