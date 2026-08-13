"use client";

import {
  BriefcaseBusiness,
  CalendarCheck,
  CheckSquare,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";

import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { formatCurrencyInr } from "@/lib/reports/services/reports-utils";
import type { CeoKpis } from "@/types/ceo-dashboard";

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function CeoDashboardKpis({ kpis }: { kpis: CeoKpis }) {
  const totalPendingApprovals = kpis.pendingApprovals + kpis.pendingLeaveApprovals;

  return (
    <section
      aria-label="Company at a glance"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      <EmployeeStatCard
        label="Employees"
        value={String(kpis.totalEmployees)}
        icon={Users}
        accent="text-sky-600 dark:text-sky-400"
        iconBg="bg-sky-500/10"
        href={CEO_ROUTES.organization}
      />
      <EmployeeStatCard
        label="Attendance"
        value={formatPercent(kpis.attendancePercent)}
        icon={CalendarCheck}
        accent={
          kpis.attendancePercent < 85
            ? "text-destructive"
            : "text-emerald-600 dark:text-emerald-400"
        }
        iconBg={kpis.attendancePercent < 85 ? "bg-destructive/10" : "bg-emerald-500/10"}
        href={CEO_ROUTES.attendance}
      />
      <EmployeeStatCard
        label="Attrition"
        value={formatPercent(kpis.attritionRate)}
        icon={TrendingDown}
        accent={kpis.attritionRate >= 5 ? "text-destructive" : "text-foreground"}
        iconBg={kpis.attritionRate >= 5 ? "bg-destructive/10" : "bg-muted"}
        href={CEO_ROUTES.organization}
      />
      <EmployeeStatCard
        label="Open Roles"
        value={String(kpis.openPositions)}
        icon={BriefcaseBusiness}
        accent="text-indigo-600 dark:text-indigo-400"
        iconBg="bg-indigo-500/10"
        href={CEO_ROUTES.recruitment}
      />
      <EmployeeStatCard
        label="Pending Approvals"
        value={String(totalPendingApprovals)}
        icon={CheckSquare}
        accent={
          totalPendingApprovals > 0
            ? "text-violet-600 dark:text-violet-400"
            : "text-foreground"
        }
        iconBg={totalPendingApprovals > 0 ? "bg-violet-500/10" : "bg-muted"}
        href={
          kpis.pendingLeaveApprovals > 0 ? CEO_ROUTES.approvalsLeave : CEO_ROUTES.approvals
        }
      />
      <EmployeeStatCard
        label="Payroll Cost"
        value={formatCurrencyInr(kpis.payrollCost)}
        icon={Wallet}
        accent="text-amber-700 dark:text-amber-400"
        iconBg="bg-amber-500/10"
        href={CEO_ROUTES.payroll}
      />
    </section>
  );
}
