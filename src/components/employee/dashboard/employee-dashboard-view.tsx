"use client";

import { EmployeeAttendanceWidget } from "@/components/employee/dashboard/employee-attendance-widget";
import { EmployeeDashboardHeader } from "@/components/employee/dashboard/employee-dashboard-header";
import { EmployeeDashboardKpiCards } from "@/components/employee/dashboard/employee-dashboard-kpis";
import { EmployeeUpcomingEvents } from "@/components/employee/dashboard/employee-upcoming-events";
import type { EmployeeDashboardData } from "@/types/employee-dashboard";

export function EmployeeDashboardView(data: EmployeeDashboardData) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back! Here&apos;s everything you need for your workday.
          </p>
        </div>

        <EmployeeDashboardHeader greeting={data.greeting} />

        <EmployeeDashboardKpiCards kpis={data.kpis} />

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <EmployeeAttendanceWidget today={data.today} />
          </div>
          <div className="lg:col-span-2">
            <EmployeeUpcomingEvents events={data.upcomingEvents} />
          </div>
        </div>
      </div>
    </div>
  );
}
