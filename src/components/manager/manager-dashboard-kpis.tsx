import Link from "next/link";

import { MANAGER_DASHBOARD_KPI_LINKS } from "@/lib/manager/constants";
import type { ManagerDashboardKpis } from "@/types/manager-dashboard";
import { cn } from "@/lib/utils";

type ManagerKpiPermissions = {
  leaveApprove: boolean;
  performance: boolean;
  recruitment: boolean;
};

function KpiCard({
  label,
  value,
  accent,
  hidden,
  href,
}: {
  label: string;
  value: number;
  accent?: string;
  hidden?: boolean;
  href: string;
}) {
  if (hidden) return null;

  return (
    <Link
      href={href}
      className="flex min-h-[5.5rem] flex-col justify-between rounded-xl border bg-card px-4 py-3.5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <p className="line-clamp-2 text-[10px] leading-snug font-medium tracking-wide text-muted-foreground uppercase lg:text-[11px]">
        {label}
      </p>
      <p className={cn("text-2xl font-semibold tracking-tight tabular-nums lg:text-3xl", accent)}>
        {value}
      </p>
    </Link>
  );
}

export function ManagerDashboardKpis({
  kpis,
  permissions,
}: {
  kpis: ManagerDashboardKpis;
  permissions?: ManagerKpiPermissions;
}) {
  const showRecruitment = permissions?.recruitment ?? true;
  const showPerformance = permissions?.performance ?? true;
  const showLeaveApprovals = permissions?.leaveApprove ?? true;

  return (
    <section aria-label="Team KPIs" className="shrink-0">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        <KpiCard
          label="Team Size"
          value={kpis.teamSize}
          href={MANAGER_DASHBOARD_KPI_LINKS.teamSize}
        />
        <KpiCard
          label="Present Today"
          value={kpis.presentToday}
          accent="text-emerald-600 dark:text-emerald-400"
          href={MANAGER_DASHBOARD_KPI_LINKS.presentToday}
        />
        <KpiCard
          label="Absent Today"
          value={kpis.onLeaveToday}
          accent="text-destructive"
          href={MANAGER_DASHBOARD_KPI_LINKS.onLeaveToday}
        />
        <KpiCard
          label="Late Today"
          value={kpis.lateToday}
          accent="text-orange-600 dark:text-orange-400"
          href={MANAGER_DASHBOARD_KPI_LINKS.lateToday}
        />
        <KpiCard
          label="Pending Leave Approvals"
          value={kpis.pendingLeaveApprovals}
          accent="text-violet-600 dark:text-violet-400"
          hidden={!showLeaveApprovals}
          href={MANAGER_DASHBOARD_KPI_LINKS.pendingLeaveApprovals}
        />
        <KpiCard
          label="Pending Performance Reviews"
          value={kpis.pendingPerformanceReviews}
          accent="text-sky-600 dark:text-sky-400"
          hidden={!showPerformance}
          href={MANAGER_DASHBOARD_KPI_LINKS.pendingPerformanceReviews}
        />
        <KpiCard
          label="Open Recruitment Requests"
          value={kpis.openRecruitmentRequests}
          accent="text-indigo-600 dark:text-indigo-400"
          hidden={!showRecruitment}
          href={MANAGER_DASHBOARD_KPI_LINKS.openRecruitmentRequests}
        />
        <KpiCard
          label="Probation Ending (30 days)"
          value={kpis.probationEndingSoon}
          accent="text-rose-600 dark:text-rose-400"
          hidden={!showPerformance}
          href={MANAGER_DASHBOARD_KPI_LINKS.probationEndingSoon}
        />
      </div>
    </section>
  );
}
