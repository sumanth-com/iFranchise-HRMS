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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-gradient-to-br from-sky-500/10 via-background to-indigo-500/5 p-3">
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-sky-400/20 blur-2xl" />
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
        People watchlist
      </p>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
        {items.slice(0, 2).map((item) => {
          const hasWork = item.value > 0;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex min-h-0 flex-col justify-between rounded-lg border bg-background/80 px-2.5 py-2 outline-none transition-colors hover:border-primary/40 hover:bg-background"
            >
              <p className="text-[10px] font-medium leading-tight text-muted-foreground">
                {item.label}
              </p>
              <div className="mt-1 flex items-end justify-between gap-1">
                <p
                  className={cn(
                    "text-xl font-semibold tabular-nums leading-none",
                    hasWork ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.value}
                </p>
                <span className="truncate text-[9px] text-muted-foreground">{item.hint}</span>
              </div>
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
  const isUrgent = item.urgency === "high" && hasWork;
  const hint = TASK_HINTS[item.id] ?? "Open the linked workflow to continue";

  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-h-0 flex-col justify-between rounded-xl border bg-muted/15 p-3 outline-none transition-colors",
        "hover:border-primary/40 hover:bg-accent/30",
        "focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/40",
        isUrgent && "border-amber-500/35 bg-gradient-to-br from-amber-500/10 via-background to-background",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm",
            isUrgent && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{item.label}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-base font-semibold tabular-nums leading-none",
            hasWork
              ? isUrgent
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                : "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
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
    <section className="flex h-full min-h-0 flex-col rounded-xl border bg-card p-3 shadow-sm md:p-4">
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
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card p-3 shadow-sm md:p-4">
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
