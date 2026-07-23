"use client";

import { format } from "date-fns";
import { useState } from "react";

import { ErrorState } from "@/components/common";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardKpiRow } from "@/components/dashboard/dashboard-kpi-rows";
import { DashboardOperationsRow } from "@/components/dashboard/dashboard-panels";
import { DailyBoostCard } from "@/components/dashboard/daily-boost-card";
import type { HrDashboardData } from "@/types/dashboard";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type Props = {
  data: HrDashboardData;
  permissionCodes: string[];
  error?: string | null;
};

export function HrDashboard({ data, error }: Props) {
  const { profile } = useAuth();
  const [referenceDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-5">
        <DashboardHeader showGreeting={false} />
        <ErrorState title="Unable to load dashboard" description={error} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:gap-3 md:p-5 lg:overflow-hidden",
      )}
    >
      <div className="shrink-0">
        <DashboardHeader showGreeting={false} />
      </div>

      <section className="shrink-0" aria-label="Key performance indicators">
        <DashboardKpiRow kpis={data.kpis} />
      </section>

      <DailyBoostCard
        firstName={profile.employee.firstName}
        lastName={profile.employee.lastName}
        personKey={profile.employee.id}
        referenceDate={referenceDate}
        className="shrink-0"
      />

      <section
        className="flex min-h-0 flex-1 flex-col"
        aria-label="Operations"
      >
        <DashboardOperationsRow
          activities={data.activities}
          tasks={data.tasks}
          charts={data.charts}
        />
      </section>
    </div>
  );
}
