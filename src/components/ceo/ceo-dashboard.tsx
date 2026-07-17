"use client";

import { ErrorState } from "@/components/common";
import { CeoDashboardHeader } from "@/components/ceo/ceo-dashboard-header";
import { CeoDashboardKpis } from "@/components/ceo/ceo-dashboard-kpis";
import { CeoDashboardPanels } from "@/components/ceo/ceo-dashboard-panels";
import { CeoDashboardSnapshot } from "@/components/ceo/ceo-dashboard-snapshot";
import type { CeoDashboardData } from "@/types/ceo-dashboard";

type CeoDashboardProps = {
  data: CeoDashboardData;
  error?: string | null;
};

export function CeoDashboard({ data, error }: CeoDashboardProps) {
  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-5">
        <ErrorState title="Unable to load executive dashboard" description={error} />
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 md:p-4 lg:gap-4 lg:p-5">
      <CeoDashboardHeader />
      <CeoDashboardKpis kpis={data.kpis} />
      <CeoDashboardSnapshot kpis={data.kpis} recruitment={data.recruitment} />
      <CeoDashboardPanels
        organization={data.organization}
        recruitment={data.recruitment}
        attendance={data.attendance}
        kpis={data.kpis}
        performance={data.performance}
        payroll={data.payroll}
      />
    </div>
  );
}
