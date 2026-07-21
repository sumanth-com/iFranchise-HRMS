"use client";

import { useState } from "react";

import { Button } from "@/components/common/button";
import { HrTeamAssetsView } from "@/components/assets/hr-team-assets-view";
import { EmployeeAssetsView } from "@/components/employee/assets/employee-assets-view";
import type { EmployeeAssetsData } from "@/types/employee-assets";
import type { AssetsSummary } from "@/types/assets";

type AssetsSection = "my" | "team";

type Props = {
  initialSection?: AssetsSection;
  canViewTeam: boolean;
  selfAssets: EmployeeAssetsData;
  teamAssets: AssetsSummary;
};

export function HrAssetsHubView({
  initialSection = "my",
  canViewTeam,
  selfAssets,
  teamAssets,
}: Props) {
  const sectionDefault =
    initialSection === "team" && canViewTeam ? "team" : "my";
  const [section, setSection] = useState<AssetsSection>(sectionDefault);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground">
            View assets assigned to you and manage company asset inventory.
          </p>
        </div>
        {canViewTeam ? (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
            <Button
              size="sm"
              variant={section === "my" ? "default" : "ghost"}
              onClick={() => setSection("my")}
            >
              My Assets
            </Button>
            <Button
              size="sm"
              variant={section === "team" ? "default" : "ghost"}
              onClick={() => setSection("team")}
            >
              Company Assets
            </Button>
          </div>
        ) : null}
      </div>

      {section === "my" || !canViewTeam ? (
        <EmployeeAssetsView data={selfAssets} />
      ) : (
        <HrTeamAssetsView summary={teamAssets} embedded />
      )}
    </div>
  );
}
