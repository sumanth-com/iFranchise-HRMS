import Link from "next/link";
import { format, parseISO } from "date-fns";
import { CalendarDays, ClipboardList, Users } from "lucide-react";

import {
  dashboardGradientTileClass,
  dashboardMetricClass,
  dashboardSectionClass,
} from "@/components/dashboard/dashboard-surface-classes";
import { HolidayGlyph } from "@/components/employee/dashboard/holiday-glyph";
import { DASHBOARD_KPI_LINKS } from "@/lib/dashboard/constants";
import type { DashboardListItem, HrTodayPulse } from "@/types/dashboard";
import { cn } from "@/lib/utils";

function PulseMetric({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href?: string;
  accent?: string;
}) {
  const content = (
    <div className={dashboardMetricClass}>
      <p className="text-[10px] font-medium leading-tight tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", accent)}>
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="min-w-0 flex-1">
        {content}
      </Link>
    );
  }
  return <div className="min-w-0 flex-1">{content}</div>;
}

function parseHolidayDate(meta: string | undefined) {
  if (!meta) return null;
  return meta.length >= 10 ? meta.slice(0, 10) : meta;
}

const HOLIDAY_CARD_THEMES = [
  "from-violet-500/15 via-indigo-500/10 to-sky-500/10",
  "from-sky-500/15 via-cyan-500/10 to-emerald-500/10",
] as const;

function HolidayFeaturedCard({
  holiday,
  badgeLabel,
  themeIndex = 0,
}: {
  holiday: DashboardListItem;
  badgeLabel: string;
  themeIndex?: number;
}) {
  const dateStr = parseHolidayDate(holiday.meta);
  if (!dateStr) return null;

  return (
    <Link
      href={holiday.href}
      className={cn(
        "group relative flex min-h-0 flex-1 flex-col dark:hover:bg-muted/20",
        dashboardGradientTileClass,
        HOLIDAY_CARD_THEMES[themeIndex % HOLIDAY_CARD_THEMES.length],
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 size-32 rounded-full blur-2xl",
          themeIndex === 0 ? "bg-violet-400/20" : "bg-sky-400/20",
        )}
      />
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl bg-background/90 shadow-sm dark:bg-background/80",
            themeIndex === 0 ? "ring-1 ring-violet-500/15" : "ring-1 ring-sky-500/15",
          )}
        >
          <HolidayGlyph name={holiday.primary} className="size-8 text-3xl leading-none" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wide",
              themeIndex === 0
                ? "text-violet-600 dark:text-violet-400"
                : "text-sky-600 dark:text-sky-400",
            )}
          >
            {badgeLabel}
          </p>
          <p className="mt-0.5 text-base font-semibold tracking-tight group-hover:text-primary">
            {holiday.primary}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {format(parseISO(dateStr), "EEEE, d MMMM yyyy")}
          </p>
        </div>
        <div className="shrink-0 rounded-lg bg-background/90 px-2.5 py-1.5 text-center shadow-sm dark:bg-background/80">
          <p
            className={cn(
              "text-xl font-bold tabular-nums leading-none",
              themeIndex === 0
                ? "text-violet-600 dark:text-violet-400"
                : "text-sky-600 dark:text-sky-400",
            )}
          >
            {format(parseISO(dateStr), "d")}
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {format(parseISO(dateStr), "MMM")}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function HrUpcomingHolidaysPanel({
  holidays,
}: {
  holidays: DashboardListItem[];
}) {
  const items = holidays
    .filter((holiday) => parseHolidayDate(holiday.meta))
    .slice(0, 2);

  if (items.length === 0) {
    return (
      <section className={cn("flex h-full min-h-0 flex-col", dashboardSectionClass)}>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <CalendarDays className="size-4" />
          </span>
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">
              Upcoming Holidays
            </h2>
            <p className="text-xs text-muted-foreground">Next breaks on the calendar</p>
          </div>
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="size-4 shrink-0" />
          No upcoming holidays in the next 30 days.
        </p>
      </section>
    );
  }

  return (
    <section className={cn("flex h-full min-h-0 flex-col", dashboardSectionClass)}>
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
          <CalendarDays className="size-3.5" />
        </span>
        <div>
          <h2 className="text-[11px] font-semibold tracking-wide text-foreground uppercase">
            Upcoming Holidays
          </h2>
          <p className="text-[11px] text-muted-foreground">Plan ahead for team time off</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        {items.map((holiday, index) => (
          <HolidayFeaturedCard
            key={holiday.id}
            holiday={holiday}
            badgeLabel={index === 0 ? "Next holiday" : "Upcoming"}
            themeIndex={index}
          />
        ))}
      </div>
    </section>
  );
}

export function HrTodayPulseSection({
  pulse,
  subtitle = "Live workforce snapshot for today",
  links = DASHBOARD_KPI_LINKS,
}: {
  pulse: HrTodayPulse;
  subtitle?: string;
  links?: {
    presentToday: string;
    absentToday: string;
    lateToday: string;
    halfDayToday: string;
    pendingLeaveApprovals: string;
    exitRequests: string;
  };
}) {
  return (
    <section className={dashboardSectionClass} aria-label="Today's Pulse">
      <div className="mb-3 flex items-center gap-2">
        <Users className="size-3.5 text-primary" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Today&apos;s Pulse</h2>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-nowrap gap-2">
        <PulseMetric
          label="Present Today"
          value={pulse.presentToday}
          href={links.presentToday}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <PulseMetric
          label="Absent Today"
          value={pulse.absentToday}
          href={links.absentToday}
          accent="text-destructive"
        />
        <PulseMetric
          label="Late Employees"
          value={pulse.lateToday}
          href={links.lateToday}
          accent="text-rose-600 dark:text-rose-400"
        />
        <PulseMetric
          label="Half Day"
          value={pulse.halfDayToday ?? 0}
          href={links.halfDayToday}
          accent="text-sky-600 dark:text-sky-400"
        />
        <PulseMetric
          label="Pending Approvals"
          value={pulse.pendingApprovals}
          href={links.pendingLeaveApprovals}
          accent="text-violet-600 dark:text-violet-400"
        />
      </div>
    </section>
  );
}
