"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  Cake,
  CalendarClock,
  ClipboardList,
  FileWarning,
  Medal,
  Palmtree,
  Sparkles,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";

import {
  dashboardEmptyStateClass,
  dashboardGradientTileClass,
  dashboardInsetTileClass,
  dashboardNestedPanelClass,
  dashboardSectionClass,
  dashboardTileClass,
} from "@/components/dashboard/dashboard-surface-classes";
import { HrUpcomingHolidaysPanel } from "@/components/dashboard/hr-today-pulse-section";
import type {
  DashboardListItem,
  DashboardPersonEvent,
  DashboardTaskItem,
  DashboardWatchItem,
} from "@/types/dashboard";
import { cn } from "@/lib/utils";

const TASK_ICONS: Record<string, LucideIcon> = {
  "onboarding-review": UserPlus,
  "documents-expiring": FileWarning,
  "active-candidates": BriefcaseBusiness,
  "payroll-due": Wallet,
  "interviews-today": CalendarClock,
  "on-leave": Palmtree,
  "probation-ending": UserPlus,
  "leave-approvals": Palmtree,
  "offers-pending": BriefcaseBusiness,
};

const TASK_HINTS: Record<string, string> = {
  "onboarding-review": "Review candidates still in onboarding",
  "documents-expiring": "Renew or verify employee documents before they lapse",
  "payroll-due": "Process this month's payroll run for your team",
  "active-candidates": "Follow up on candidates still in the hiring pipeline",
  "interviews-today": "Interviews scheduled for today",
  "on-leave": "Employees on approved leave today",
};

function PeopleWatchlistCard({ items }: { items: DashboardWatchItem[] }) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        dashboardNestedPanelClass,
      )}
    >
      <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        People watchlist
      </p>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
        {items.slice(0, 2).map((item) => {
          const hasWork = item.value > 0;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={dashboardInsetTileClass}
            >
              <p className="text-[10px] font-medium leading-tight text-muted-foreground">
                {item.label}
              </p>
              <p
                className={cn(
                  "mt-2 text-3xl font-semibold tabular-nums leading-none",
                  hasWork ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.value}
              </p>
              <span className="mt-1.5 text-[9px] text-muted-foreground">{item.hint}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function FocusTaskCard({ item }: { item: DashboardTaskItem }) {
  const Icon = TASK_ICONS[item.id] ?? ClipboardList;
  const hasWork = (item.count ?? 0) > 0;
  const hint = TASK_HINTS[item.id] ?? "Open the linked workflow to continue";

  return (
    <Link
      href={item.href}
      className={cn("flex min-h-0 flex-col justify-between", dashboardTileClass)}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground">{item.label}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span
          className={cn(
            "rounded-md px-2.5 py-0.5 text-base font-semibold tabular-nums leading-none",
            hasWork ? "bg-primary/10 text-primary" : "bg-muted/70 text-muted-foreground",
          )}
        >
          {item.count ?? 0}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
          Open
          <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

function HrPriorityFocus({
  items,
  description = "Payroll, interviews, leave, and onboarding",
}: {
  items: DashboardTaskItem[];
  description?: string;
}) {
  const cards = items.slice(0, 4);
  if (cards.length === 0) return null;

  return (
    <section className={cn("flex h-full min-h-0 flex-col", dashboardSectionClass)}>
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-3.5" />
        </span>
        <div>
          <h2 className="text-[11px] font-semibold tracking-wide text-foreground uppercase">
            Focus Today
          </h2>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5">
        {cards.map((item) => (
          <FocusTaskCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

const CELEBRATION_THEMES = {
  birthday: {
    gradient: "from-rose-500/15 via-pink-500/10 to-orange-500/10",
    blur: "bg-rose-400/20",
    ring: "ring-rose-500/15",
    accent: "text-rose-600 dark:text-rose-400",
    badge: "Birthday",
  },
  anniversary: {
    gradient: "from-indigo-500/15 via-violet-500/10 to-purple-500/10",
    blur: "bg-indigo-400/20",
    ring: "ring-indigo-500/15",
    accent: "text-indigo-600 dark:text-indigo-400",
    badge: "Work anniversary",
  },
} as const;

function CelebrationFeaturedCard({
  event,
  kind,
  className,
}: {
  event: DashboardPersonEvent;
  kind: "birthday" | "anniversary";
  className?: string;
}) {
  const theme = CELEBRATION_THEMES[kind];
  const Icon = kind === "birthday" ? Cake : Medal;
  const dateStr = event.date.slice(0, 10);

  return (
    <Link
      href={event.href}
      className={cn(
        "flex h-full min-h-0 flex-col p-2.5 dark:hover:bg-muted/20",
        dashboardGradientTileClass,
        theme.gradient,
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 size-28 rounded-full blur-2xl",
          theme.blur,
        )}
      />
      <div className="flex min-h-0 flex-1 items-center gap-2.5">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-background/90 shadow-sm ring-1 dark:bg-background/80",
            theme.ring,
          )}
        >
          <Icon className={cn("size-4", theme.accent)} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[10px] font-semibold uppercase tracking-wide", theme.accent)}>
            {theme.badge}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold tracking-tight group-hover:text-primary">
            {event.name}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {event.subtitle ? `${event.subtitle} · ` : ""}
            {format(parseISO(dateStr), "EEE, d MMM yyyy")}
          </p>
        </div>
        <div className="shrink-0 rounded-lg bg-background/90 px-2 py-1 text-center shadow-sm dark:bg-background/80">
          <p className={cn("text-lg font-bold tabular-nums leading-none", theme.accent)}>
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
  ].sort((a, b) => a.date.localeCompare(b.date));
  const scrollable = events.length > 2;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        dashboardNestedPanelClass,
      )}
    >
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <Cake className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
            Team Celebrations
          </p>
          <p className="text-[11px] text-muted-foreground">
            Birthdays and work anniversaries coming up
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className={dashboardEmptyStateClass}>
          <Medal className="size-5 text-muted-foreground/60" />
          <p className="mt-2 text-sm font-medium text-foreground">No celebrations soon</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Birthdays in the next 7 days appear here.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "min-h-0 flex-1",
            scrollable && "overflow-y-auto overscroll-contain [scrollbar-gutter:stable]",
          )}
        >
          <ul className="flex h-full min-h-0 flex-col gap-2">
            {events.map((event) => (
              <li
                key={`${event.kind}-${event.id}`}
                className={cn(
                  "min-h-0 shrink-0",
                  scrollable || events.length === 1
                    ? "h-[calc((100%-0.5rem)/2)]"
                    : "flex-1 basis-0",
                )}
              >
                <CelebrationFeaturedCard event={event} kind={event.kind} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HrInsightsPanel({
  watchItems,
  birthdays,
  anniversaries,
  title = "HR Insights",
  description = "People to watch and upcoming celebrations",
}: {
  watchItems: DashboardWatchItem[];
  birthdays: DashboardPersonEvent[];
  anniversaries: DashboardPersonEvent[];
  title?: string;
  description?: string;
}) {
  return (
    <section className={cn("flex h-full min-h-0 flex-col overflow-hidden", dashboardSectionClass)}>
      <div className="mb-2 shrink-0">
        <h2 className="text-[11px] font-semibold tracking-wide text-foreground uppercase">
          {title}
        </h2>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>

      <div className="grid min-h-0 flex-1 gap-2.5 lg:grid-cols-2 lg:items-stretch">
        <PeopleWatchlistCard items={watchItems} />
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
  watchItems,
  upcomingHolidays,
  upcomingBirthdays,
  upcomingAnniversaries,
  insightsTitle,
  insightsDescription,
  focusDescription,
}: {
  tasks: DashboardTaskItem[];
  watchItems: DashboardWatchItem[];
  upcomingHolidays: DashboardListItem[];
  upcomingBirthdays: DashboardPersonEvent[];
  upcomingAnniversaries: DashboardPersonEvent[];
  insightsTitle?: string;
  insightsDescription?: string;
  focusDescription?: string;
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden">
      <div className="grid min-h-0 gap-3 overflow-hidden xl:grid-cols-2 xl:items-stretch">
        <HrPriorityFocus items={tasks} description={focusDescription} />
        <HrUpcomingHolidaysPanel holidays={upcomingHolidays} />
      </div>

      <div className="min-h-0 overflow-hidden">
        <HrInsightsPanel
          watchItems={watchItems}
          birthdays={upcomingBirthdays}
          anniversaries={upcomingAnniversaries}
          title={insightsTitle}
          description={insightsDescription}
        />
      </div>
    </div>
  );
}
