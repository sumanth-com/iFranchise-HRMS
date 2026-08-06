import { redirect } from "next/navigation";

import { Suspense } from "react";

import { HrAssetsHubView } from "@/components/assets/hr-assets-hub-view";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { SELF_ASSETS_ROUTES } from "@/lib/assets/constants";
import { getAssetsSummary } from "@/lib/assets/services/asset-queries";
import { legacyHubTabRedirectUrl } from "@/lib/dashboard/hub-paths";
import { getEmployeeAssetsData } from "@/lib/employee/services/employee-assets-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";

const TEAM_ASSETS_PERMISSIONS = [
  "asset.view",
  "asset.create",
  "asset.edit",
  "asset.assign",
] as const;

async function AssetsHubContent({
  section,
  searchParams,
}: {
  section: "my" | "team";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireServerPermission("asset.view");
  const supabase = await createClient();
  const raw = await searchParams;
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [...TEAM_ASSETS_PERMISSIONS]);

  const [selfAssets, teamSummary] = await Promise.all([
    getEmployeeAssetsData(supabase, profile),
    canViewTeam ? getAssetsSummary(supabase, profile) : Promise.resolve(null),
  ]);

  return (
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
  );
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AssetsSelfServicePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const legacy = legacyHubTabRedirectUrl(SELF_ASSETS_ROUTES.list, raw);
  if (legacy) redirect(legacy);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <AssetsHubContent section="my" searchParams={searchParams} />
    </Suspense>
  );
}

export async function AssetsTeamPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const legacy = legacyHubTabRedirectUrl(SELF_ASSETS_ROUTES.list, raw);
  if (legacy && legacy !== SELF_ASSETS_ROUTES.team) redirect(legacy);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <AssetsHubContent section="team" searchParams={searchParams} />
    </Suspense>
  );
}
