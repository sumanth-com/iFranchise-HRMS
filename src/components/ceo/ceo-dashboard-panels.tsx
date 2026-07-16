"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CheckSquare,
  Target,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { BarRow } from "@/components/reports/report-chart-cards";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { formatCurrencyInr } from "@/lib/reports/services/reports-utils";
import type {
  CeoAttendanceOverview,
  CeoChartItem,
  CeoKpis,
  CeoOrgSnapshot,
  CeoPayrollOverview,
  CeoPerformanceOverview,
  CeoRecruitmentOverview,
} from "@/types/ceo-dashboard";
import { cn } from "@/lib/utils";

function seriesMax(items: CeoChartItem[]) {
  return Math.max(1, ...items.map((item) => item.value));
}

function Panel({
  title,
  subtitle,
  href,
  children,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open
            <ArrowRight className="size-3" />
          </Link>
        ) : null}
      </div>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

function WorkforcePanel({
  organization,
  recruitment,
  attendance,
}: {
  organization: CeoOrgSnapshot;
  recruitment: CeoRecruitmentOverview;
  attendance: CeoAttendanceOverview;
}) {
  const deptItems = organization.departmentDistribution.slice(0, 5);
  const max = seriesMax(deptItems);

  return (
    <Panel
      title="Workforce"
      subtitle="Headcount and today’s presence"
      href={CEO_ROUTES.organization}
    >
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg border bg-background/80 px-2.5 py-2">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Present
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {attendance.presentToday}
          </p>
        </div>
        <div className="rounded-lg border bg-background/80 px-2.5 py-2">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Absent
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {attendance.absentToday}
          </p>
        </div>
        <div className="rounded-lg border bg-background/80 px-2.5 py-2">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Interviews
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {recruitment.interviewsToday}
          </p>
        </div>
      </div>

      <p className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        Headcount by Department
      </p>
      {deptItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No department data yet.</p>
      ) : (
        <div className="space-y-2">
          {deptItems.map((item) => (
            <BarRow
              key={item.label}
              label={item.label}
              value={item.value}
              max={max}
              color="bg-primary"
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function PriorityTile({
  label,
  value,
  detail,
  href,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <Link
      href={href}
      className="flex h-full min-h-0 flex-col justify-between rounded-lg border bg-background/80 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-7 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
          {icon}
        </span>
        <p className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</p>
      </div>
      <div className="mt-2">
        <p className="text-xs font-medium">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>
      </div>
    </Link>
  );
}

function PrioritiesPanel({
  kpis,
  recruitment,
  performance,
  payroll,
}: {
  kpis: CeoKpis;
  recruitment: CeoRecruitmentOverview;
  performance: CeoPerformanceOverview;
  payroll: CeoPayrollOverview;
}) {
  return (
    <Panel
      title="Priorities"
      subtitle="Key decisions and company status"
      href={CEO_ROUTES.approvals}
      bodyClassName="grid grid-cols-2 gap-2"
    >
      <PriorityTile
        label="Approvals"
        value={String(kpis.pendingApprovals)}
        detail={kpis.pendingApprovals > 0 ? "Needs your decision" : "All clear"}
        href={CEO_ROUTES.approvals}
        icon={<CheckSquare className="size-3.5" />}
        tone={
          kpis.pendingApprovals > 0
            ? "text-violet-600 dark:text-violet-400"
            : undefined
        }
      />
      <PriorityTile
        label="Reviews"
        value={String(performance.pendingReviews)}
        detail={
          performance.pendingReviews > 0 ? "Still incomplete" : "No backlog"
        }
        href={CEO_ROUTES.performance}
        icon={<Target className="size-3.5" />}
        tone={
          performance.pendingReviews > 0
            ? "text-amber-700 dark:text-amber-400"
            : undefined
        }
      />
      <PriorityTile
        label="Open Roles"
        value={String(recruitment.openJobs)}
        detail={`${recruitment.candidates} in pipeline`}
        href={CEO_ROUTES.recruitment}
        icon={<BriefcaseBusiness className="size-3.5" />}
      />
      <PriorityTile
        label="Payroll"
        value={payroll.status}
        detail={formatCurrencyInr(payroll.salaryCost)}
        href={CEO_ROUTES.payroll}
        icon={<Wallet className="size-3.5" />}
        tone={payroll.pending ? "text-amber-700 dark:text-amber-400" : undefined}
      />
    </Panel>
  );
}

export function CeoDashboardPanels({
  organization,
  recruitment,
  attendance,
  kpis,
  performance,
  payroll,
}: {
  organization: CeoOrgSnapshot;
  recruitment: CeoRecruitmentOverview;
  attendance: CeoAttendanceOverview;
  kpis: CeoKpis;
  performance: CeoPerformanceOverview;
  payroll: CeoPayrollOverview;
}) {
  return (
    <div className="grid w-full shrink-0 gap-3 lg:grid-cols-2 lg:items-stretch">
      <WorkforcePanel
        organization={organization}
        recruitment={recruitment}
        attendance={attendance}
      />
      <PrioritiesPanel
        kpis={kpis}
        recruitment={recruitment}
        performance={performance}
        payroll={payroll}
      />
    </div>
  );
}
