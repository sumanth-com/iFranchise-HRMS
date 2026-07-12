import Link from "next/link";

import {
  DASHBOARD_KPI_LINKS,
  DASHBOARD_SECONDARY_LINKS,
} from "@/lib/dashboard/constants";
import type { DashboardKpis, DashboardSecondaryMetrics } from "@/types/dashboard";
import { cn } from "@/lib/utils";

function KpiTile({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  href: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border bg-card px-3 py-2.5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("mt-1 text-xl font-semibold tracking-tight tabular-nums", accent)}>
        {value}
      </p>
    </Link>
  );
}

export function DashboardKpiRow({ kpis }: { kpis: DashboardKpis }) {
  const items: { key: keyof typeof DASHBOARD_KPI_LINKS; label: string; value: number; accent?: string }[] = [
    { key: "totalEmployees", label: "Total Employees", value: kpis.totalEmployees },
    { key: "presentToday", label: "Present Today", value: kpis.presentToday, accent: "text-emerald-600 dark:text-emerald-400" },
    { key: "onLeaveToday", label: "On Leave Today", value: kpis.onLeaveToday, accent: "text-amber-600 dark:text-amber-400" },
    { key: "absentToday", label: "Absent Today", value: kpis.absentToday, accent: "text-destructive" },
    { key: "lateToday", label: "Late Today", value: kpis.lateToday, accent: "text-orange-600 dark:text-orange-400" },
    { key: "newJoinersThisMonth", label: "New Joiners", value: kpis.newJoinersThisMonth },
    { key: "employeesExiting", label: "Exiting", value: kpis.employeesExiting },
    { key: "openRecruitments", label: "Open Recruitments", value: kpis.openRecruitments },
    { key: "pendingApprovals", label: "Pending Approvals", value: kpis.pendingApprovals, accent: "text-violet-600 dark:text-violet-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
      {items.map((item) => (
        <KpiTile
          key={item.key}
          label={item.label}
          value={item.value}
          href={DASHBOARD_KPI_LINKS[item.key]}
          accent={item.accent}
        />
      ))}
    </div>
  );
}

export function DashboardSecondaryRow({
  secondary,
}: {
  secondary: DashboardSecondaryMetrics;
}) {
  const items: {
    key: keyof typeof DASHBOARD_SECONDARY_LINKS;
    label: string;
    value: string;
  }[] = [
    {
      key: "attendancePercent",
      label: "Attendance %",
      value: `${secondary.attendancePercent}%`,
    },
    {
      key: "leaveUtilizationPercent",
      label: "Leave %",
      value: `${secondary.leaveUtilizationPercent}%`,
    },
    {
      key: "payrollStatus",
      label: "Payroll Status",
      value: secondary.payrollStatus,
    },
    {
      key: "upcomingBirthdaysCount",
      label: "Birthdays",
      value: String(secondary.upcomingBirthdaysCount),
    },
    {
      key: "upcomingAnniversariesCount",
      label: "Anniversaries",
      value: String(secondary.upcomingAnniversariesCount),
    },
    {
      key: "probationEndingSoon",
      label: "Probation Ending",
      value: String(secondary.probationEndingSoon),
    },
    {
      key: "documentsExpiring",
      label: "Docs Expiring",
      value: String(secondary.documentsExpiring),
    },
    {
      key: "assetsPendingReturn",
      label: "Assets Pending",
      value: String(secondary.assetsPendingReturn),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
      {items.map((item) => (
        <KpiTile
          key={item.key}
          label={item.label}
          value={item.value}
          href={DASHBOARD_SECONDARY_LINKS[item.key]}
        />
      ))}
    </div>
  );
}
