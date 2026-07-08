import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { AssignmentsManagement } from "@/components/assets/assignments-management";
import {
  getAssetsLookups,
  listAssignments,
} from "@/lib/assets/services/asset-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { assignmentListParamsSchema } from "@/lib/validations/assets";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AssetAssignmentsPage({ searchParams }: Props) {
  const profile = await requireServerPermission("asset.view");
  const supabase = await createClient();
  const raw = await searchParams;

  const params = assignmentListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    employeeId: typeof raw.employeeId === "string" ? raw.employeeId : undefined,
    assetId: typeof raw.assetId === "string" ? raw.assetId : undefined,
    assignmentStatus:
      typeof raw.assignmentStatus === "string" ? raw.assignmentStatus : undefined,
  });

  const [result, lookups] = await Promise.all([
    listAssignments(supabase, profile, params),
    getAssetsLookups(supabase, profile),
  ]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AssignmentsManagement
        result={result}
        lookups={lookups}
        permissionCodes={profile.permissionCodes}
      />
    </Suspense>
  );
}
