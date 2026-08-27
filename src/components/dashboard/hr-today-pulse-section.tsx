import Link from "next/link";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { Cake, Medal, Sparkles, Users } from "lucide-react";

import {
  dashboardGradientTileClass,
  dashboardMetricClass,
  dashboardSectionClass,
} from "@/components/dashboard/dashboard-surface-classes";
import { HolidayGlyph } from "@/components/employee/dashboard/holiday-glyph";
import { DASHBOARD_KPI_LINKS } from "@/lib/dashboard/constants";
import type { DashboardListItem, DashboardPersonEvent, HrTodayPulse } from "@/types/dashboard";
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

const CELEBRATION_CARD_THEMES = [
  "from-violet-500/15 via-indigo-500/10 to-sky-500/10",
  "from-rose-500/15 via-pink-500/10 to-amber-500/10",
  "from-sky-500/15 via-cyan-500/10 to-emerald-500/10",
] as const;

type UnifiedCelebrationItem = {
  id: string;
  kind: "birthday" | "holiday" | "anniversary";
  title: string;
  subtitle: string;
  dateStr: string;
  badgeLabel: string;
  relativeLabel: string;
  href?: string;
  isToday: boolean;
};

function CelebrationFeaturedCard({
  item,
  themeIndex = 0,
}: {
  item: UnifiedCelebrationItem;
  themeIndex?: number;
}) {
  const isBirthday = item.kind === "birthday";
  const isAnniversary = item.kind === "anniversary";
  const themeClass = isBirthday
    ? "from-rose-500/15 via-pink-500/10 to-amber-500/10"
    : isAnniversary
      ? "from-amber-500/15 via-orange-500/10 to-yellow-500/10"
      : CELEBRATION_CARD_THEMES[themeIndex % CELEBRATION_CARD_THEMES.length];

  const content = (
    <div
      className={cn(
        "group relative flex min-h-0 flex-1 flex-col p-2.5 dark:hover:bg-muted/20",
        dashboardGradientTileClass,
        themeClass,
        item.isToday &&
          (isBirthday
            ? "ring-1 ring-rose-500/30"
            : isAnniversary
              ? "ring-1 ring-amber-500/30"
              : "ring-1 ring-violet-500/30"),
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 size-32 rounded-full blur-2xl",
          isBirthday
            ? "bg-rose-400/20"
            : isAnniversary
              ? "bg-amber-400/20"
              : themeIndex === 0
                ? "bg-violet-400/20"
                : "bg-sky-400/20",
        )}
      />
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl bg-background/90 shadow-sm dark:bg-background/80",
            isBirthday
              ? "ring-1 ring-rose-500/20 text-rose-600 dark:text-rose-400"
              : isAnniversary
                ? "ring-1 ring-amber-500/20 text-amber-600 dark:text-amber-400"
                : themeIndex === 0
                  ? "ring-1 ring-violet-500/15"
                  : "ring-1 ring-sky-500/15",
          )}
        >
          {isBirthday ? (
            <Cake className="size-5" />
          ) : isAnniversary ? (
            <Medal className="size-5" />
          ) : (
            <HolidayGlyph name={item.title} className="size-8 text-3xl leading-none" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                isBirthday
                  ? "text-rose-600 dark:text-rose-400"
                  : isAnniversary
                    ? "text-amber-600 dark:text-amber-400"
                    : themeIndex === 0
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-sky-600 dark:text-sky-400",
              )}
            >
              {item.badgeLabel}
            </p>
            {item.relativeLabel && !item.isToday ? (
              <span className="text-[10px] text-muted-foreground">
                · {item.relativeLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold tracking-tight group-hover:text-primary">
            {item.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {item.isToday
              ? isBirthday
                ? "Celebrating birthday today!"
                : isAnniversary
                  ? `${item.subtitle} · Today`
                  : `${item.subtitle} · Today`
              : `${item.subtitle} · ${format(parseISO(item.dateStr), "EEEE, d MMM")}`}
          </p>
        </div>
        <div className="shrink-0 rounded-lg bg-background/90 px-2.5 py-1.5 text-center shadow-sm dark:bg-background/80">
          <p
            className={cn(
              "text-xl font-bold tabular-nums leading-none",
              isBirthday
                ? "text-rose-600 dark:text-rose-400"
                : isAnniversary
                  ? "text-amber-600 dark:text-amber-400"
                  : themeIndex === 0
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-sky-600 dark:text-sky-400",
            )}
          >
            {format(parseISO(item.dateStr), "d")}
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {format(parseISO(item.dateStr), "MMM")}
          </p>
        </div>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="flex min-h-0 flex-1 flex-col">
        {content}
      </Link>
    );
  }

  return content;
}

export function HrUpcomingHolidaysPanel({
  holidays = [],
  birthdays = [],
  anniversaries = [],
  referenceDate,
}: {
  holidays: DashboardListItem[];
  birthdays?: DashboardPersonEvent[];
  anniversaries?: DashboardPersonEvent[];
  referenceDate?: string;
}) {
  const refDateStr = referenceDate || format(new Date(), "yyyy-MM-dd");
  const refDate = parseISO(refDateStr);
  const in7Days = format(addDays(refDate, 7), "yyyy-MM-dd");

  const items: UnifiedCelebrationItem[] = [];

  for (const holiday of holidays) {
    const dateStr = parseHolidayDate(holiday.meta);
    if (!dateStr || dateStr < refDateStr || dateStr > in7Days) continue;
    const days = differenceInCalendarDays(parseISO(dateStr), refDate);
    const isToday = days <= 0;
    const relativeLabel = isToday ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;

    items.push({
      id: `holiday-${holiday.id}`,
      kind: "holiday",
      title: holiday.primary,
      subtitle: holiday.secondary || "Company holiday",
      dateStr,
      badgeLabel: isToday ? "Today" : holiday.secondary || "Holiday",
      relativeLabel,
      href: holiday.href,
      isToday,
    });
  }

  for (const bday of birthdays) {
    const dateStr = bday.date.slice(0, 10);
    if (dateStr < refDateStr || dateStr > in7Days) continue;
    const days = differenceInCalendarDays(parseISO(dateStr), refDate);
    const isToday = days <= 0;
    const relativeLabel = isToday ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;

    items.push({
      id: `bday-${bday.id}`,
      kind: "birthday",
      title: bday.name,
      subtitle: "Birthday",
      dateStr,
      badgeLabel: isToday ? "Today" : "Birthday",
      relativeLabel,
      href: bday.href,
      isToday,
    });
  }

  for (const ann of anniversaries) {
    const dateStr = ann.date.slice(0, 10);
    if (dateStr < refDateStr || dateStr > in7Days) continue;
    const days = differenceInCalendarDays(parseISO(dateStr), refDate);
    const isToday = days <= 0;
    const relativeLabel = isToday ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;

    items.push({
      id: `ann-${ann.id}`,
      kind: "anniversary",
      title: ann.name,
      subtitle: ann.subtitle ? `${ann.subtitle} work anniversary` : "Work anniversary",
      dateStr,
      badgeLabel: isToday ? "Today" : "Anniversary",
      relativeLabel,
      href: ann.href,
      isToday,
    });
  }

  items.sort((a, b) => {
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    return a.dateStr.localeCompare(b.dateStr);
  });

  const displayItems = items.slice(0, 2);

  if (displayItems.length === 0) {
    return (
      <section className={cn("flex h-full min-h-0 flex-col", dashboardSectionClass)}>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Sparkles className="size-3.5" />
          </span>
          <div>
            <h2 className="text-[11px] font-semibold tracking-wide text-foreground uppercase">
              Celebrations & This Week
            </h2>
            <p className="text-[11px] text-muted-foreground">Today & this week&apos;s highlights</p>
          </div>
        </div>
        <div className="mt-2 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/15 p-4 text-center dark:bg-white/[0.02]">
          <Sparkles className="size-4 text-muted-foreground/60" />
          <p className="mt-1.5 text-xs font-semibold text-foreground">
            Nothing to celebrate this week
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            We&apos;ll highlight birthdays and holidays here when they come up.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("flex h-full min-h-0 flex-col", dashboardSectionClass)}>
      <div className="mb-2.5 flex shrink-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
          <Sparkles className="size-3.5" />
        </span>
        <div>
          <h2 className="text-[11px] font-semibold tracking-wide text-foreground uppercase">
            Celebrations & This Week
          </h2>
          <p className="text-[11px] text-muted-foreground">Today & this week&apos;s highlights</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        {displayItems.map((item, index) => (
          <CelebrationFeaturedCard
            key={item.id}
            item={item}
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
