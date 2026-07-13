"use client";

import { formatDistanceToNow, parseISO } from "date-fns";
import {
  BriefcaseBusiness,
  CalendarCheck2,
  ClipboardList,
  FileText,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { AUDIT_ROUTES } from "@/lib/audit/constants";
import type {
  DashboardActivityItem,
  DashboardChartItem,
  DashboardCharts,
  DashboardTaskItem,
} from "@/types/dashboard";
import { cn } from "@/lib/utils";

const TASK_ICONS: Record<string, LucideIcon> = {
  "interviews-today": BriefcaseBusiness,
  "probation-ending": UserCheck,
  "payroll-due": Wallet,
  "offers-pending": FileText,
};

const MODULE_ICONS: Record<string, LucideIcon> = {
  employees: Users,
  attendance: CalendarCheck2,
  leave: ClipboardList,
  payroll: Wallet,
  recruitment: BriefcaseBusiness,
  exit: Users,
  system: Users,
};

function seriesMax(items: DashboardChartItem[]) {
  return Math.max(1, ...items.map((item) => item.value));
}

function shortLabel(label: string) {
  if (/^\d{2}\s/.test(label)) return label.slice(0, 2);
  return label.length > 8 ? `${label.slice(0, 7)}…` : label;
}

function VerticalBarChart({
  title,
  items,
  barClassName,
  empty,
}: {
  title: string;
  items: DashboardChartItem[];
  barClassName: string;
  empty: string;
}) {
  const rows = items.slice(0, 7);
  const max = seriesMax(rows);

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-background p-3">
      <h3 className="mb-2 shrink-0 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="flex min-h-[7.5rem] flex-1 items-end gap-1.5 px-1 pt-1">
          {rows.map((item) => {
            const height = Math.max(item.value > 0 ? 8 : 2, (item.value / max) * 100);
            return (
              <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1">
                <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {item.value}
                </span>
                <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                  <div
                    className={cn(
                      "w-full max-w-7 rounded-t-md transition-all",
                      item.value > 0 ? barClassName : "bg-muted",
                    )}
                    style={{ height: `${height}%` }}
                    title={`${item.label}: ${item.value}`}
                  />
                </div>
                <span className="w-full shrink-0 truncate text-center text-[9px] text-muted-foreground">
                  {shortLabel(item.label)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PriorityTasks({ items }: { items: DashboardTaskItem[] }) {
  return (
    <section className="shrink-0 rounded-xl border bg-card p-3 shadow-sm md:p-4">
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">
        Priority Tasks
      </h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = TASK_ICONS[item.id] ?? ClipboardList;
          const hasWork = (item.count ?? 0) > 0;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex min-h-[4.5rem] flex-col justify-between rounded-xl border bg-background px-3.5 py-3 outline-none transition-colors",
                "hover:border-primary/40 hover:bg-accent/30",
                "focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/40",
                !hasWork && "opacity-80",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                  <Icon className="size-4" />
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    hasWork ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.count ?? 0}
                </span>
              </div>
              <p className="mt-2.5 line-clamp-2 text-sm font-medium leading-snug">{item.label}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function RecentActivity({ items }: { items: DashboardActivityItem[] }) {
  const rows = items.slice(0, 2);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border bg-card p-3 shadow-sm md:p-4">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">
          Recent Activity
        </h2>
        <Link
          href={AUDIT_ROUTES.logs}
          className="inline-flex h-7 items-center rounded-full border bg-background px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          View all
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No recent activity"
          description="Meaningful HR events will appear here."
          className="flex-1 border-0 bg-transparent p-2 shadow-none"
        />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col justify-center divide-y">
          {rows.map((item) => {
            const Icon = MODULE_ICONS[item.module] ?? Users;
            const body = (
              <div className="flex items-center gap-2.5 py-2.5 transition-colors hover:bg-muted/30">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.user}</p>
                    <time className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(parseISO(item.occurredAt), { addSuffix: true })}
                    </time>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{item.title}</span>
                    {item.description ? ` · ${item.description}` : null}
                  </p>
                </div>
              </div>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function HrInsightsPanel({ charts }: { charts: DashboardCharts }) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm md:p-4">
      <div className="shrink-0">
        <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">
          HR Insights
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Attendance and hiring trends at a glance.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-3">
        <VerticalBarChart
          title="Attendance (7 days)"
          items={charts.attendanceTrend7Days}
          barClassName="bg-gradient-to-t from-emerald-600 to-emerald-400"
          empty="No attendance data yet."
        />
        <VerticalBarChart
          title="Monthly hiring"
          items={charts.monthlyHiring.slice(-6)}
          barClassName="bg-gradient-to-t from-violet-600 to-violet-400"
          empty="No hiring data yet."
        />
      </div>
    </section>
  );
}

export function DashboardOperationsRow({
  activities,
  tasks,
  charts,
}: {
  activities: DashboardActivityItem[];
  tasks: DashboardTaskItem[];
  charts: DashboardCharts;
}) {
  return (
    <div className="grid h-full min-h-0 auto-rows-fr gap-3 lg:grid-cols-2 lg:items-stretch">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <PriorityTasks items={tasks} />
        <RecentActivity items={activities} />
      </div>
      <div className="h-full min-h-0">
        <HrInsightsPanel charts={charts} />
      </div>
    </div>
  );
}
