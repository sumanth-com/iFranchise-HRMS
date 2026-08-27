"use client";

import {
  CalendarCheck,
  CheckSquare,
  Users,
  Wallet,
} from "lucide-react";

import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { formatCurrencyInr } from "@/lib/reports/services/reports-utils";
import type { CeoKpis } from "@/types/ceo-dashboard";

function asNumber(value: number | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatPercent(value: number | null | undefined) {
  const safe = asNumber(value);
  return `${safe.toFixed(safe % 1 === 0 ? 0 : 1)}%`;
}

export function CeoDashboardKpis({ kpis }: { kpis: CeoKpis }) {
  const attendancePercent = asNumber(kpis.attendancePercent);
  const pendingApprovals = asNumber(kpis.pendingApprovals);
  const pendingLeaveApprovals = asNumber(kpis.pendingLeaveApprovals);
  const totalPendingApprovals = pendingApprovals + pendingLeaveApprovals;

  return (
    <section
      aria-label="Company at a glance"
      className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <EmployeeStatCard
        label="Employees"
        value={String(asNumber(kpis.totalEmployees))}
        hint="Headcount"
        icon={Users}
        accent="text-sky-600 dark:text-sky-400"
        iconBg="bg-sky-500/10"
        tone="sky"
        href={CEO_ROUTES.organization}
      />
      <EmployeeStatCard
        label="Attendance"
        value={formatPercent(attendancePercent)}
        hint="Today"
        icon={CalendarCheck}
        accent={
          attendancePercent < 85
            ? "text-destructive"
            : "text-emerald-600 dark:text-emerald-400"
        }
        iconBg={attendancePercent < 85 ? "bg-destructive/10" : "bg-emerald-500/10"}
        tone="emerald"
        href={CEO_ROUTES.attendance}
      />
      <EmployeeStatCard
        label="Pending Approvals"
        value={String(totalPendingApprovals)}
        hint={totalPendingApprovals > 0 ? "Pending" : "Cleared"}
        icon={CheckSquare}
        accent={
          totalPendingApprovals > 0
            ? "text-violet-600 dark:text-violet-400"
            : "text-foreground"
        }
        iconBg={totalPendingApprovals > 0 ? "bg-violet-500/10" : "bg-muted"}
        tone="violet"
        href={
          pendingLeaveApprovals > 0 ? CEO_ROUTES.approvalsLeave : CEO_ROUTES.approvals
        }
      />
      <EmployeeStatCard
        label="Payroll Cost"
        value={formatCurrencyInr(asNumber(kpis.payrollCost))}
        hint="Monthly"
        icon={Wallet}
        accent="text-amber-700 dark:text-amber-400"
        iconBg="bg-amber-500/10"
        tone="amber"
        href={CEO_ROUTES.payrollRun}
      />
    </section>
  );
}
