"use client";

import {
  AssetsDashboardPanels,
  AssetsSummaryCards,
} from "@/components/assets/assets-dashboard-panels";
import type { AssetsSummary } from "@/types/assets";

type HrTeamAssetsViewProps = {
  summary: AssetsSummary;
  embedded?: boolean;
};

export function HrTeamAssetsView({ summary, embedded = false }: HrTeamAssetsViewProps) {
  return (
    <div className="space-y-6">
      <div>
        {embedded ? (
          <h2 className="text-lg font-semibold tracking-tight">Company Assets</h2>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">Company Assets</h1>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Track inventory, assignments, maintenance, warranties, and vendors.
        </p>
      </div>
      <AssetsSummaryCards summary={summary} />
      <AssetsDashboardPanels summary={summary} />
    </div>
  );
}
