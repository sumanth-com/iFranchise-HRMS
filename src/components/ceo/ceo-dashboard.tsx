"use client";

import { format } from "date-fns";
import { useState } from "react";

import { ErrorState } from "@/components/common";
import { CeoDashboardHeader } from "@/components/ceo/ceo-dashboard-header";
import { CeoDashboardKpis } from "@/components/ceo/ceo-dashboard-kpis";
import { CeoDashboardPanels } from "@/components/ceo/ceo-dashboard-panels";
import { CeoDashboardSnapshot } from "@/components/ceo/ceo-dashboard-snapshot";
import { DailyBoostCard } from "@/components/dashboard/daily-boost-card";
import type { CeoDashboardData } from "@/types/ceo-dashboard";
import { useAuth } from "@/providers/auth-provider";

type CeoDashboardProps = {
  data: CeoDashboardData;
  error?: string | null;
};

export function CeoDashboard({ data, error }: CeoDashboardProps) {
  const { profile } = useAuth();
  const [referenceDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-5">
        <ErrorState title="Unable to load executive dashboard" description={error} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto p-3 md:p-4 lg:gap-3 lg:overflow-hidden lg:p-5">
      <div className="flex shrink-0 flex-col gap-2 lg:gap-3">
        <CeoDashboardHeader />
        <CeoDashboardKpis kpis={data.kpis} />
        <CeoDashboardSnapshot kpis={data.kpis} recruitment={data.recruitment} />
      </div>

      <section className="flex min-h-0 flex-1 flex-col lg:overflow-hidden">
        <CeoDashboardPanels
          organization={data.organization}
          recruitment={data.recruitment}
          attendance={data.attendance}
          kpis={data.kpis}
          performance={data.performance}
          payroll={data.payroll}
        />
      </section>

      <DailyBoostCard
        firstName={profile.employee.firstName}
        lastName={profile.employee.lastName}
        personKey={profile.employee.id}
        referenceDate={referenceDate}
        compact
        className="shrink-0"
      />
    </div>
  );
}
