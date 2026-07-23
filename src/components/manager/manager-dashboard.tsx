"use client";

import { format } from "date-fns";
import { useState } from "react";

import { ErrorState } from "@/components/common";
import { DailyBoostCard } from "@/components/dashboard/daily-boost-card";
import { ManagerDashboardHeader } from "@/components/manager/manager-dashboard-header";
import { ManagerDashboardKpis } from "@/components/manager/manager-dashboard-kpis";
import { ManagerDashboardPanels } from "@/components/manager/manager-dashboard-panels";
import type { ManagerDashboardData } from "@/types/manager-dashboard";
import { useAuth } from "@/providers/auth-provider";

type ManagerDashboardProps = {
  data: ManagerDashboardData;
  error?: string | null;
};

export function ManagerDashboard({
  data,
  error,
}: ManagerDashboardProps) {
  const { profile } = useAuth();
  const [referenceDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 md:p-5">
        <ErrorState title="Unable to load manager dashboard" description={error} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 md:p-4 lg:gap-3 lg:overflow-hidden lg:p-5">
      <div className="flex shrink-0 flex-col gap-2 lg:gap-3">
        <ManagerDashboardHeader />
        <ManagerDashboardKpis kpis={data.kpis} />
      </div>

      <section className="flex min-h-0 flex-1 flex-col lg:overflow-hidden">
        <ManagerDashboardPanels
          actionItems={data.actionItems}
          activities={data.activities}
          focusFilter="all"
          selectedEmployeeId={null}
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
