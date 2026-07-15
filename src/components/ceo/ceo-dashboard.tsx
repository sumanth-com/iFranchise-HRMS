"use client";

import { ErrorState } from "@/components/common";
import { CeoDashboardHeader } from "@/components/ceo/ceo-dashboard-header";
import { CeoDashboardInsights } from "@/components/ceo/ceo-dashboard-insights";
import { CeoDashboardKpis } from "@/components/ceo/ceo-dashboard-kpis";
import { CeoDashboardPanels } from "@/components/ceo/ceo-dashboard-panels";
import type { CeoDashboardData } from "@/types/ceo-dashboard";

type CeoDashboardProps = {
  data: CeoDashboardData;
  error?: string | null;
};

export function CeoDashboard({ data, error }: CeoDashboardProps) {
  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 md:p-5">
        <ErrorState title="Unable to load executive dashboard" description={error} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 md:p-4 lg:p-5">
      <CeoDashboardHeader />
      <CeoDashboardKpis kpis={data.kpis} />
      <CeoDashboardInsights insights={data.insights} />
      <CeoDashboardPanels
        organization={data.organization}
        recruitment={data.recruitment}
        payroll={data.payroll}
        attendance={data.attendance}
        charts={data.charts}
        approvals={data.approvals}
        activities={data.activities}
      />
    </div>
  );
}
