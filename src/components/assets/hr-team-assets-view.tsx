"use client";

import { AssetActivitySection } from "@/components/assets/asset-activity-section";
import { HrAssignAssetWizard } from "@/components/assets/hr-assign-asset-wizard";
import { canCreateAssets } from "@/lib/assets/constants";
import type {
  AssetActivityItem,
  AssetListResult,
  AssetsLookups,
} from "@/types/assets";

type HrTeamAssetsViewProps = {
  lookups?: AssetsLookups | null;
  inventory?: AssetListResult | null;
  activity?: AssetActivityItem[];
  canAssign?: boolean;
  permissionCodes?: string[];
  embedded?: boolean;
};

export function HrTeamAssetsView({
  lookups = null,
  inventory = null,
  activity = [],
  canAssign = false,
  permissionCodes = [],
  embedded = false,
}: HrTeamAssetsViewProps) {
  return (
    <div className="space-y-6">
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Company Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign devices to employees, register assets, and review history.
          </p>
        </div>
      ) : null}

      {canAssign && lookups ? (
        <HrAssignAssetWizard
          lookups={lookups}
          inventory={inventory?.data ?? []}
          canCreate={canCreateAssets(permissionCodes)}
        />
      ) : null}

      <AssetActivitySection
        activity={activity}
        lookups={lookups}
        inventory={inventory?.data ?? []}
        permissionCodes={permissionCodes}
        showAddButton={!canAssign}
      />
    </div>
  );
}
