"use client";

import {
  BriefcaseBusiness,
  Cake,
  ClipboardList,
  FileText,
  Medal,
  UserCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";

import { HrUpcomingHolidaysPanel } from "@/components/dashboard/hr-today-pulse-section";
import type {
  DashboardChartItem,
  DashboardCharts,
  DashboardListItem,
  DashboardPersonEvent,
  DashboardTaskItem,
} from "@/types/dashboard";
import { cn } from "@/lib/utils";

const TASK_ICONS: Record<string, LucideIcon> = {
  "interviews-today": BriefcaseBusiness,
  "probation-ending": UserCheck,
  "payroll-due": Wallet,
  "offers-pending": FileText,
};

function seriesMax(items: DashboardChartItem[]) {
  return Math.max(1, ...items.map((item) => item.value));
}

function AttendanceSparkline({ items }: { items: DashboardChartItem[] }) {
  const rows = items.slice(-7);
  const max = seriesMax(rows);
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  const width = 280;
  const height = 52;
  const padX = 8;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points =
    rows.length === 0
      ? []
      : rows.map((item, index) => {
          const x = padX + (rows.length === 1 ? innerW / 2 : (index / (rows.length - 1)) * innerW);
          const y = padY + innerH - (item.value / max) * innerH;
          return { x, y, item };
        });

  const linePath =
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
      : "";
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`
      : "";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/5 p-3">
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-emerald-400/20 blur-2xl" />
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Attendance pulse
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">
            {total}
            <span className="ml-1 text-xs font-normal text-muted-foreground">present (7d)</span>
          </p>
        </div>
        <span className="rounded-full border bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          7 days
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No attendance data yet.</p>
      ) : (
        <div className="mt-1.5 min-h-0 shrink-0">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-12 w-full"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="attendanceArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {areaPath ? <path d={areaPath} fill="url(#attendanceArea)" /> : null}
            {linePath ? (
              <path
                d={linePath}
                fill="none"
                stroke="rgb(16 185 129)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {points.map((point) => (
              <circle
                key={point.item.label}
                cx={point.x}
                cy={point.y}
                r={point.item.value > 0 ? 4 : 2.5}
                className={point.item.value > 0 ? "fill-emerald-500" : "fill-muted-foreground/40"}
              />
            ))}
          </svg>
          <div className="mt-1 flex justify-between gap-1 text-[9px] text-muted-foreground">
            {rows.map((item) => (
              <span key={item.label} className="flex-1 truncate text-center tabular-nums">
                {item.label.slice(0, 3)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PriorityTasks({ items }: { items: DashboardTaskItem[] }) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border bg-card p-3 shadow-sm md:p-4">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <ClipboardList className="size-3.5" />
        </span>
        <div>
          <h2 className="text-[11px] font-semibold tracking-wide text-foreground uppercase">
            Priority Tasks
          </h2>
          <p className="text-[11px] text-muted-foreground">Items needing your attention</p>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2.5">
        {items.map((item) => {
          const Icon = TASK_ICONS[item.id] ?? ClipboardList;
          const hasWork = (item.count ?? 0) > 0;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex min-h-[4.25rem] flex-col justify-between rounded-lg border bg-muted/15 px-3 py-2.5 outline-none transition-colors",
                "hover:border-primary/40 hover:bg-accent/30",
                "focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/40",
                !hasWork && "opacity-80",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                  <Icon className="size-3.5" />
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
              <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{item.label}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function TeamCelebrationsPanel({
  birthdays,
  anniversaries,
}: {
  birthdays: DashboardPersonEvent[];
  anniversaries: DashboardPersonEvent[];
}) {
  const events = [
    ...birthdays.map((event) => ({ ...event, kind: "birthday" as const })),
    ...anniversaries.map((event) => ({ ...event, kind: "anniversary" as const })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-gradient-to-br from-rose-500/10 via-background to-amber-500/5 p-3">
      <div className="pointer-events-none absolute -right-6 top-0 size-20 rounded-full bg-rose-400/15 blur-2xl" />
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <Cake className="size-3" />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
            Team celebrations
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-background/50 px-3 py-4 text-center">
          <Medal className="size-4 text-muted-foreground/60" />
          <p className="mt-2 text-xs font-medium text-foreground">No celebrations soon</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Birthdays in the next 7 days appear here.
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain">
          {events.map((event) => {
            const Icon = event.kind === "birthday" ? Cake : Medal;
            const accent =
              event.kind === "birthday"
                ? "text-rose-600 dark:text-rose-400"
                : "text-amber-600 dark:text-amber-400";
            const iconBg =
              event.kind === "birthday" ? "bg-rose-500/10" : "bg-amber-500/10";
            const kindLabel = event.kind === "birthday" ? "Birthday" : "Work anniversary";

            const row = (
              <div className="flex items-center gap-2.5 rounded-lg border bg-background/75 px-2.5 py-2 transition-colors hover:bg-background">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md",
                    iconBg,
                    accent,
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{event.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {kindLabel}
                    {event.subtitle ? ` · ${event.subtitle}` : ""}
                  </p>
                </div>
                <time
                  className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground"
                  dateTime={event.date}
                >
                  {format(parseISO(event.date), "d MMM")}
                </time>
              </div>
            );

            return (
              <li key={`${event.kind}-${event.id}`}>
                <Link
                  href={event.href}
                  className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {row}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function HrInsightsPanel({
  charts,
  birthdays,
  anniversaries,
  title = "HR Insights",
  description = "Attendance pulse and upcoming celebrations",
}: {
  charts: DashboardCharts;
  birthdays: DashboardPersonEvent[];
  anniversaries: DashboardPersonEvent[];
  title?: string;
  description?: string;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card p-3 shadow-sm md:p-4">
      <div className="mb-2 shrink-0">
        <h2 className="text-[11px] font-semibold tracking-wide text-foreground uppercase">
          {title}
        </h2>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>

      <div className="grid min-h-0 flex-1 gap-2.5 lg:grid-cols-2 lg:items-stretch">
        <AttendanceSparkline items={charts.attendanceTrend7Days} />
        <TeamCelebrationsPanel
          birthdays={birthdays}
          anniversaries={anniversaries}
        />
      </div>
    </section>
  );
}

export function DashboardOperationsRow({
  tasks,
  charts,
  upcomingHolidays,
  upcomingBirthdays,
  upcomingAnniversaries,
  insightsTitle,
  insightsDescription,
}: {
  tasks: DashboardTaskItem[];
  charts: DashboardCharts;
  upcomingHolidays: DashboardListItem[];
  upcomingBirthdays: DashboardPersonEvent[];
  upcomingAnniversaries: DashboardPersonEvent[];
  insightsTitle?: string;
  insightsDescription?: string;
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden">
      <div className="grid min-h-0 gap-3 overflow-hidden xl:grid-cols-2 xl:items-stretch">
        <PriorityTasks items={tasks} />
        <HrUpcomingHolidaysPanel holidays={upcomingHolidays} />
      </div>

      <div className="min-h-0 overflow-hidden">
        <HrInsightsPanel
          charts={charts}
          birthdays={upcomingBirthdays}
          anniversaries={upcomingAnniversaries}
          title={insightsTitle}
          description={insightsDescription}
        />
      </div>
    </div>
  );
}
