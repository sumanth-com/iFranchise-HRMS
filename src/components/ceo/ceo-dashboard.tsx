"use client";

import { format } from "date-fns";
import { useState } from "react";

import { ErrorState } from "@/components/common";
import { DailyBoostCard } from "@/components/dashboard/daily-boost-card";
import { CeoDashboardKpis } from "@/components/ceo/ceo-dashboard-kpis";
import { CeoDashboardToday } from "@/components/ceo/ceo-dashboard-today";
import { EmployeeDashboardHeader } from "@/components/employee/dashboard/employee-dashboard-header";
import { EmployeeUpcomingEvents } from "@/components/employee/dashboard/employee-upcoming-events";
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5 lg:overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[88rem] flex-col gap-3 md:gap-4 lg:overflow-hidden">
        <div className="shrink-0">
          <EmployeeDashboardHeader
            greeting={{
              employeeId: profile.employee.id,
              firstName: profile.employee.firstName,
              lastName: profile.employee.lastName,
              fullName: `${profile.employee.firstName} ${profile.employee.lastName}`.trim(),
              employeeCode: profile.employee.employeeCode,
              designation: null,
              departmentName: null,
              avatarUrl: null,
            }}
          />
        </div>

        <div className="shrink-0">
          <CeoDashboardKpis kpis={data.kpis} />
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[3fr_2fr] lg:items-stretch lg:overflow-hidden">
          <div className="flex min-h-0 flex-col gap-3 lg:h-full lg:gap-4">
            <CeoDashboardToday attendance={data.attendance} />
            <DailyBoostCard
              firstName={profile.employee.firstName}
              lastName={profile.employee.lastName}
              personKey={profile.employee.id}
              referenceDate={referenceDate}
              tone="executive"
              className="min-h-0 flex-1"
            />
          </div>
          <EmployeeUpcomingEvents
            events={data.upcomingHolidays}
            referenceDate={referenceDate}
            className="min-h-0 lg:h-full"
          />
        </div>
      </div>
    </div>
  );
}
