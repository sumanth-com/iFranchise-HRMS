import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { AssetsInventoryManagement } from "@/components/assets/assets-inventory-management";
import {
  getAssetsLookups,
  listAssets,
} from "@/lib/assets/services/asset-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { assetListParamsSchema } from "@/lib/validations/assets";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AssetsInventoryPage({ searchParams }: Props) {
  const profile = await requireServerPermission("asset.view");
  const supabase = await createClient();
  const raw = await searchParams;

  const params = assetListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    categoryId: typeof raw.categoryId === "string" ? raw.categoryId : undefined,
    assetStatus: typeof raw.assetStatus === "string" ? raw.assetStatus : undefined,
    departmentId: typeof raw.departmentId === "string" ? raw.departmentId : undefined,
    location: typeof raw.location === "string" ? raw.location : undefined,
  });

  const [result, lookups] = await Promise.all([
    listAssets(supabase, profile, params),
    getAssetsLookups(supabase, profile),
  ]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AssetsInventoryManagement
        result={result}
        lookups={lookups}
        permissionCodes={profile.permissionCodes}
      />
    </Suspense>
  );
}
