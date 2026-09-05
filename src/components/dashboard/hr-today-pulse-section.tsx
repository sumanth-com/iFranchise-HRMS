import Link from "next/link";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  Cake,
  CalendarDays,
  CircleAlert,
  Clock3,
  Medal,
  Sparkles,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  dashboardGradientTileClass,
  dashboardMetricClass,
  dashboardSectionClass,
} from "@/components/dashboard/dashboard-surface-classes";
import { HolidayGlyph } from "@/components/employee/dashboard/holiday-glyph";
import { birthdayCardMessage, birthdayDisplayFirstName } from "@/lib/employee/birthday-utils";
import { DASHBOARD_KPI_LINKS } from "@/lib/dashboard/constants";
import type { DashboardListItem, DashboardPersonEvent, HrTodayPulse } from "@/types/dashboard";
import { cn } from "@/lib/utils";

type DashboardVisualTone = "default" | "vibrant";

type PulseTone = {
  accent: string;
  icon: LucideIcon;
  iconWrap: string;
  tile: string;
  glow: string;
};

const PULSE_BRAND = {
  accent: "text-violet-700 dark:text-violet-300",
  iconWrap: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
  tile: "bg-white ring-1 ring-inset ring-violet-500/12 dark:bg-card",
  glow: "bg-violet-400/20",
} as const;

const PULSE_TONES: Record<string, PulseTone> = {
  present: { ...PULSE_BRAND, icon: UserCheck },
  absent: { ...PULSE_BRAND, icon: CircleAlert },
  late: { ...PULSE_BRAND, icon: Clock3 },
  pending: { ...PULSE_BRAND, icon: Sparkles },
};

function PulseMetric({
  label,
  value,
  href,
  accent,
  toneKey,
  visualTone = "default",
}: {
  label: string;
  value: number;
  href?: string;
  accent?: string;
  toneKey?: keyof typeof PULSE_TONES;
  visualTone?: DashboardVisualTone;
}) {
  const tone = toneKey ? PULSE_TONES[toneKey] : undefined;
  const Icon = tone?.icon;
  const content = (
    <div
      className={cn(
        dashboardMetricClass,
        "relative h-full min-h-[5.5rem] w-full px-3.5 py-3",
        visualTone === "vibrant" && tone?.tile,
      )}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="min-w-0 pr-1 text-[11px] font-medium leading-snug tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {visualTone === "vibrant" && Icon ? (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              tone.iconWrap,
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "relative z-10 mt-2 text-2xl font-semibold tracking-tight tabular-nums",
          visualTone === "vibrant" && tone ? tone.accent : accent,
        )}
      >
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex h-full min-w-0">
        {content}
      </Link>
    );
  }
  return <div className="flex h-full min-w-0">{content}</div>;
}

function parseHolidayDate(meta: string | undefined) {
  if (!meta) return null;
  return meta.length >= 10 ? meta.slice(0, 10) : meta;
}

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
  fill = false,
}: {
  item: UnifiedCelebrationItem;
  /** Stretch to fill available panel height when this is the only card. */
  fill?: boolean;
}) {
  const isBirthday = item.kind === "birthday";
  const isAnniversary = item.kind === "anniversary";
  const firstName = birthdayDisplayFirstName(undefined, item.title);

  const content = (
    <div
      className={cn(
        "group relative flex min-h-0 flex-col bg-white p-3 ring-1 ring-inset ring-violet-500/12 dark:bg-card dark:hover:bg-muted/20",
        dashboardGradientTileClass,
        "from-violet-500/8 via-white to-violet-500/5",
        item.isToday && "ring-violet-500/30",
        isBirthday && "from-rose-500/10 via-white to-violet-500/5",
        isBirthday && item.isToday && "ring-rose-500/30",
        fill ? "h-full flex-1 items-center justify-center text-center" : "flex-1",
      )}
    >
      <div className={cn("flex gap-3", fill ? "w-full max-w-sm flex-col items-center" : "items-start")}>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-500/10 text-violet-700 ring-1 ring-violet-500/15 dark:bg-background/80 dark:text-violet-300",
            fill ? "size-14" : "size-11",
            isBirthday && "bg-rose-500/10 text-rose-700 ring-rose-500/15 dark:text-rose-300",
          )}
        >
          {isBirthday ? (
            <Cake className={fill ? "size-6" : "size-5"} />
          ) : isAnniversary ? (
            <Medal className={fill ? "size-6" : "size-5"} />
          ) : (
            <HolidayGlyph
              name={item.title}
              className={cn("leading-none", fill ? "size-10 text-4xl" : "size-8 text-3xl")}
            />
          )}
        </span>
        <div className={cn("min-w-0", fill ? "w-full" : "flex-1")}>
          <div className={cn("flex items-center gap-1.5", fill && "justify-center")}>
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                isBirthday
                  ? "text-rose-700 dark:text-rose-400"
                  : "text-violet-700 dark:text-violet-400",
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
          <p
            className={cn(
              "mt-0.5 text-sm font-semibold tracking-tight group-hover:text-primary",
              fill ? "line-clamp-2" : "truncate",
            )}
          >
            {item.title}
          </p>
          <p
            className={cn(
              "mt-0.5 text-xs text-muted-foreground",
              fill ? "line-clamp-3" : "truncate",
            )}
          >
            {isBirthday
              ? birthdayCardMessage({ firstName, title: item.title, isToday: item.isToday })
              : item.isToday
                ? `${item.subtitle} · Today`
                : `${item.subtitle} · ${format(parseISO(item.dateStr), "EEEE, d MMM")}`}
          </p>
        </div>
        {!fill ? (
          <div className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-center ring-1 ring-violet-500/10 dark:bg-background/80">
            <p className="text-xl font-bold tabular-nums leading-none text-violet-700 dark:text-violet-400">
              {format(parseISO(item.dateStr), "d")}
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase text-muted-foreground">
              {format(parseISO(item.dateStr), "MMM")}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[11px] font-medium tracking-wide text-muted-foreground/80 tabular-nums uppercase">
            {format(parseISO(item.dateStr), "EEEE, d MMM yyyy")}
          </p>
        )}
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={cn("flex min-h-0 flex-col", fill && "h-full flex-1")}>
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
        <div className="mt-2 flex flex-1 flex-col items-center justify-center rounded-xl bg-violet-500/[0.04] px-5 text-center ring-1 ring-violet-500/12">
          <span className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
            <CalendarDays className="size-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-foreground">
            Nothing to celebrate this week
          </p>
          <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
            No holidays or birthdays coming up. Enjoy a productive week!
          </p>
        </div>
      </section>
    );
  }

  const single = displayItems.length === 1;

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
        {displayItems.map((item) => (
          <CelebrationFeaturedCard key={item.id} item={item} fill={single} />
        ))}
      </div>
    </section>
  );
}

export function HrTodayPulseSection({
  pulse,
  subtitle = "Live workforce snapshot for today",
  links = DASHBOARD_KPI_LINKS,
  visualTone = "default",
}: {
  pulse: HrTodayPulse;
  subtitle?: string;
  links?: {
    presentToday: string;
    absentToday: string;
    lateToday: string;
    pendingLeaveApprovals: string;
    exitRequests: string;
  };
  visualTone?: DashboardVisualTone;
}) {
  return (
    <section
      className={cn(
        dashboardSectionClass,
        visualTone === "vibrant" && "bg-white ring-1 ring-inset ring-violet-500/10 dark:bg-card",
      )}
      aria-label="Today's Pulse"
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-lg",
            visualTone === "vibrant"
              ? "bg-violet-500/15 text-violet-600 dark:text-violet-300"
              : "text-primary",
          )}
        >
          <Users className="size-3.5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Today&apos;s Pulse</h2>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PulseMetric
          label="Present Today"
          value={pulse.presentToday}
          href={links.presentToday}
          accent="text-emerald-600 dark:text-emerald-400"
          toneKey="present"
          visualTone={visualTone}
        />
        <PulseMetric
          label="Absent Today"
          value={pulse.absentToday}
          href={links.absentToday}
          accent="text-destructive"
          toneKey="absent"
          visualTone={visualTone}
        />
        <PulseMetric
          label="Late Employees"
          value={pulse.lateToday}
          href={links.lateToday}
          accent="text-rose-600 dark:text-rose-400"
          toneKey="late"
          visualTone={visualTone}
        />
        <PulseMetric
          label="Pending Approvals"
          value={pulse.pendingApprovals}
          href={links.pendingLeaveApprovals}
          accent="text-violet-600 dark:text-violet-400"
          toneKey="pending"
          visualTone={visualTone}
        />
      </div>
    </section>
  );
}
