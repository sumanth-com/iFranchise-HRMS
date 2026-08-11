"use client";

import { HrTeamAssetsView } from "@/components/assets/hr-team-assets-view";
import { EmployeeAssetsView } from "@/components/employee/assets/employee-assets-view";
import type { EmployeeAssetsData } from "@/types/employee-assets";
import type { AssetActivityItem, AssetListResult, AssetsLookups } from "@/types/assets";

type AssetsSection = "my" | "team";

type Props = {
  initialSection?: AssetsSection;
  canViewTeam: boolean;
  canAssign?: boolean;
  selfAssets: EmployeeAssetsData;
  teamLookups?: AssetsLookups | null;
  teamInventory?: AssetListResult | null;
  teamActivity?: AssetActivityItem[];
  permissionCodes?: string[];
};

export function HrAssetsHubView({
  initialSection = "my",
  canViewTeam,
  canAssign = false,
  selfAssets,
  teamLookups = null,
  teamInventory = null,
  teamActivity = [],
  permissionCodes = [],
}: Props) {
  const section = initialSection === "team" && canViewTeam ? "team" : "my";
  const isTeamView = section === "team";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isTeamView ? "Company Assets" : "Assets"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isTeamView
            ? "Manage company asset inventory, assignments, and maintenance."
            : "View assets assigned to you and their status."}
        </p>
      </div>

      {isTeamView ? (
        <HrTeamAssetsView
          lookups={teamLookups}
          inventory={teamInventory}
          activity={teamActivity}
          canAssign={canAssign}
          permissionCodes={permissionCodes}
          embedded
        />
      ) : (
        <EmployeeAssetsView data={selfAssets} readOnly />
      )}
    </div>
  );
}
