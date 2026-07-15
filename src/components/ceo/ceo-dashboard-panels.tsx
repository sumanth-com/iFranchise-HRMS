"use client";

import { formatDistanceToNow, parseISO } from "date-fns";
import { ArrowRight, CheckSquare, Loader2, Radio } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { BarRow } from "@/components/reports/report-chart-cards";
import { fetchCeoDashboardActivitiesAction } from "@/lib/ceo/actions/ceo-dashboard-actions";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { formatCurrencyInr } from "@/lib/reports/services/reports-utils";
import type {
  CeoActivityItem,
  CeoApprovalItem,
  CeoAttendanceOverview,
  CeoChartItem,
  CeoDashboardCharts,
  CeoOrgSnapshot,
  CeoPayrollOverview,
  CeoRecruitmentOverview,
} from "@/types/ceo-dashboard";
import { cn } from "@/lib/utils";

const LIVE_POLL_MS = 30_000;
const TIME_REFRESH_MS = 60_000;

function seriesMax(items: CeoChartItem[]) {
  return Math.max(1, ...items.map((item) => item.value));
}

function Panel({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card p-3.5 shadow-sm sm:p-4">
      <div className="mb-2.5 flex shrink-0 items-start justify-between gap-2">
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
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">{children}</div>
    </section>
  );
}

function priorityClass(priority: CeoApprovalItem["priority"]) {
  switch (priority) {
    case "high":
      return "border-l-destructive";
    case "medium":
      return "border-l-amber-500";
    default:
      return "border-l-muted-foreground/30";
  }
}

function SnapshotPanel({
  organization,
  recruitment,
  attendance,
  payroll,
  charts,
}: {
  organization: CeoOrgSnapshot;
  recruitment: CeoRecruitmentOverview;
  attendance: CeoAttendanceOverview;
  payroll: CeoPayrollOverview;
  charts: CeoDashboardCharts;
}) {
  const deptItems = organization.departmentDistribution.slice(0, 5);
  const max = seriesMax(deptItems);

  return (
    <Panel
      title="Company Snapshot"
      subtitle="Headcount, hiring, and attendance"
      href={CEO_ROUTES.analytics}
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-background/80 px-2.5 py-2">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Departments
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {organization.totalDepartments}
          </p>
        </div>
        <div className="rounded-lg border bg-background/80 px-2.5 py-2">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Managers
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {organization.totalManagers}
          </p>
        </div>
        <div className="rounded-lg border bg-background/80 px-2.5 py-2">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Interviews Today
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {recruitment.interviewsToday}
          </p>
        </div>
        <div className="rounded-lg border bg-background/80 px-2.5 py-2">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Present Today
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {attendance.presentToday}
          </p>
        </div>
        <div className="rounded-lg border bg-background/80 px-2.5 py-2">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Payroll
          </p>
          <p className="mt-1 truncate text-sm font-semibold">{payroll.status}</p>
        </div>
        <div className="rounded-lg border bg-background/80 px-2.5 py-2">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Salary Cost
          </p>
          <p className="mt-1 truncate text-sm font-semibold tabular-nums">
            {formatCurrencyInr(payroll.salaryCost)}
          </p>
        </div>
      </div>

      <div className="mt-3">
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
      </div>

      {charts.hiringTrend.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Hiring Trend
          </p>
          <div className="space-y-2">
            {charts.hiringTrend.slice(-4).map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={seriesMax(charts.hiringTrend.slice(-4))}
                color="bg-sky-500"
              />
            ))}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function ApprovalsPanel({ approvals }: { approvals: CeoApprovalItem[] }) {
  return (
    <Panel
      title="CEO Approvals"
      subtitle="Executive queue"
      href={CEO_ROUTES.approvals}
    >
      {approvals.length === 0 ? (
        <EmptyState
          title="All clear"
          description="No senior approvals waiting."
          className="h-full border-0 bg-transparent p-2 shadow-none"
        />
      ) : (
        <ul className="space-y-2">
          {approvals.slice(0, 8).map((item) => (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border border-l-[3px] bg-background/80 px-3 py-2 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]",
                    priorityClass(item.priority),
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                    <CheckSquare className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
                  </div>
                </Link>
              ) : (
                <div
                  className={cn(
                    "rounded-lg border border-l-[3px] bg-background/80 px-3 py-2",
                    priorityClass(item.priority),
                  )}
                >
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ActivityPanel({ initialActivities }: { initialActivities: CeoActivityItem[] }) {
  const [activities, setActivities] = useState(initialActivities);
  const [isPending, startTransition] = useTransition();
  const [, setTick] = useState(0);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  useEffect(() => {
    const pollId = window.setInterval(() => {
      startTransition(async () => {
        const result = await fetchCeoDashboardActivitiesAction();
        if (result.success) setActivities(result.data);
      });
    }, LIVE_POLL_MS);
    const timeId = window.setInterval(() => setTick((value) => value + 1), TIME_REFRESH_MS);
    return () => {
      window.clearInterval(pollId);
      window.clearInterval(timeId);
    };
  }, []);

  return (
    <Panel title="Activity Feed" subtitle="Live company timeline">
      <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Radio className="size-3 text-emerald-500" />
        Live
        {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
      </div>
      {activities.length === 0 ? (
        <EmptyState
          title="No recent activity"
          description="Company events will appear here."
          className="h-full border-0 bg-transparent p-2 shadow-none"
        />
      ) : (
        <ul className="space-y-2">
          {activities.slice(0, 12).map((item) => {
            const content = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(parseISO(item.occurredAt), { addSuffix: true })}
                </span>
              </>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border bg-background/80 px-3 py-2">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function CeoDashboardPanels({
  organization,
  recruitment,
  payroll,
  attendance,
  charts,
  approvals,
  activities,
}: {
  organization: CeoOrgSnapshot;
  recruitment: CeoRecruitmentOverview;
  payroll: CeoPayrollOverview;
  attendance: CeoAttendanceOverview;
  charts: CeoDashboardCharts;
  approvals: CeoApprovalItem[];
  activities: CeoActivityItem[];
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3">
      <SnapshotPanel
        organization={organization}
        recruitment={recruitment}
        attendance={attendance}
        payroll={payroll}
        charts={charts}
      />
      <ApprovalsPanel approvals={approvals} />
      <ActivityPanel initialActivities={activities} />
    </div>
  );
}
