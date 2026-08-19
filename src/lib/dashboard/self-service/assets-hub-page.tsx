import { redirect } from "next/navigation";

import { Suspense } from "react";

import { HrAssetsHubView } from "@/components/assets/hr-assets-hub-view";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { canAssignAssets, SELF_ASSETS_ROUTES } from "@/lib/assets/constants";
import { getAssetsLookups, getAssetActivityFeed, listAssets } from "@/lib/assets/services/asset-queries";
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
  void (await searchParams);
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [...TEAM_ASSETS_PERMISSIONS]);
  const canAssign = canAssignAssets(profile.permissionCodes);

  const [selfAssets, lookups, inventory, activity] = await Promise.all([
    getEmployeeAssetsData(supabase, profile),
    canViewTeam ? getAssetsLookups(supabase, profile) : Promise.resolve(null),
    canViewTeam
      ? listAssets(supabase, profile, { page: 1, pageSize: 100 })
      : Promise.resolve(null),
    canViewTeam ? getAssetActivityFeed(supabase, profile, { limit: 100, activityType: "all" }) : Promise.resolve([]),
  ]);

  return (
    <HrAssetsHubView
      initialSection={section}
      canViewTeam={canViewTeam}
      canAssign={canAssign}
      selfAssets={selfAssets}
      teamLookups={lookups}
      teamInventory={inventory}
      teamActivity={activity}
      permissionCodes={profile.permissionCodes}
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
