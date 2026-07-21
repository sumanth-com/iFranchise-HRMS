import { Suspense } from "react";

import { HrAssetsHubView } from "@/components/assets/hr-assets-hub-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { getAssetsSummary } from "@/lib/assets/services/asset-queries";
import { getEmployeeAssetsData } from "@/lib/employee/services/employee-assets-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TEAM_ASSETS_PERMISSIONS = [
  "asset.view",
  "asset.create",
  "asset.edit",
  "asset.assign",
] as const;

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function parseSection(value: string | undefined): "my" | "team" {
  return value === "team" ? "team" : "my";
}

export default async function AssetsSelfServicePage({ searchParams }: PageProps) {
  const profile = await requireServerPermission("asset.view");
  const supabase = await createClient();
  const raw = await searchParams;
  const section = parseSection(firstString(raw.tab));
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [
    ...TEAM_ASSETS_PERMISSIONS,
  ]);

  const [selfAssets, teamSummary] = await Promise.all([
    getEmployeeAssetsData(supabase, profile),
    canViewTeam ? getAssetsSummary(supabase, profile) : Promise.resolve(null),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <HrAssetsHubView
        initialSection={section}
        canViewTeam={canViewTeam}
        selfAssets={selfAssets}
        teamAssets={
          teamSummary ?? {
            totalAssets: 0,
            assignedAssets: 0,
            availableAssets: 0,
            underMaintenance: 0,
            lostAssets: 0,
            warrantyExpiring: 0,
            assetsByCategory: [],
            assetsByDepartment: [],
            recentAssignments: [],
            warrantyTimeline: [],
          }
        }
      />
    </Suspense>
  );
}
