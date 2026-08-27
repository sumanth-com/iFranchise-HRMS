"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Cake, Sparkles } from "lucide-react";

import {
  EmployeeSectionCard,
  employeeDateBadgeClass,
  employeeEventRowClass,
} from "@/components/employee/dashboard/employee-module-primitives";
import { HolidayGlyph } from "@/components/employee/dashboard/holiday-glyph";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { cn } from "@/lib/utils";
import type { EmployeeUpcomingEvent } from "@/types/employee-dashboard";

function countdownLabel(date: string, referenceDate: string): string {
  try {
    const eventDate = parseISO(date.slice(0, 10));
    const refDate = parseISO(referenceDate.slice(0, 10));
    const days = differenceInCalendarDays(eventDate, refDate);
    if (days <= 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `In ${days} days`;
  } catch {
    return date;
  }
}

function BirthdayEventRow({
  event,
  referenceDate,
}: {
  event: EmployeeUpcomingEvent;
  referenceDate: string;
}) {
  const eventDate = parseISO(event.date);
  const timing = countdownLabel(event.date, referenceDate);
  const isToday = timing === "Today";

  return (
    <li
      className={cn(
        employeeEventRowClass,
        "group relative",
        isToday && "bg-rose-500/[0.04] ring-1 ring-rose-500/25 dark:bg-rose-500/[0.06] dark:ring-rose-500/30",
      )}
    >
      <div className="relative shrink-0">
        <EmployeeAvatar
          firstName={event.firstName || event.title}
          lastName={event.lastName || ""}
          profileImagePath={event.profileImagePath}
          signedUrl={event.avatarUrl}
          className="size-10 rounded-lg ring-1 ring-border/50"
        />
        {isToday ? (
          <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs">
            <Cake className="size-2.5" />
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">
            {event.title}
          </p>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.2 text-[10px] font-semibold tracking-wide uppercase",
              isToday
                ? "bg-rose-500/15 text-rose-700 dark:bg-rose-400/20 dark:text-rose-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isToday ? "Today" : "Birthday"}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {isToday ? "Celebrating birthday today!" : `Birthday · ${timing}`}
        </p>
      </div>

      <div className={cn(employeeDateBadgeClass, "shrink-0")}>
        <div
          className={cn(
            "px-1 py-0.5 text-[9px] font-bold tracking-wide uppercase",
            isToday
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
              : "bg-primary/10 text-primary",
          )}
        >
          {format(eventDate, "MMM")}
        </div>
        <div className="flex min-h-[1.75rem] items-center justify-center py-0.5 text-base font-bold tabular-nums leading-none text-foreground">
          {format(eventDate, "d")}
        </div>
      </div>
    </li>
  );
}

function HolidayEventRow({
  event,
  referenceDate,
}: {
  event: EmployeeUpcomingEvent;
  referenceDate: string;
}) {
  const eventDate = parseISO(event.date);
  const timing = countdownLabel(event.date, referenceDate);
  const isToday = timing === "Today";

  return (
    <li
      className={cn(
        employeeEventRowClass,
        "group relative",
        isToday && "bg-violet-500/[0.04] ring-1 ring-violet-500/25 dark:bg-violet-500/[0.06] dark:ring-violet-500/30",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/40 dark:border dark:border-border/40 dark:bg-white/[0.04]",
          isToday && "bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",
        )}
      >
        <HolidayGlyph name={event.title} className="text-2xl leading-none" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">
            {event.title}
          </p>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.2 text-[10px] font-semibold tracking-wide uppercase",
              isToday
                ? "bg-violet-500/15 text-violet-700 dark:bg-violet-400/20 dark:text-violet-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            {timing}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {event.subtitle || "Company holiday"}
        </p>
      </div>

      <div className={cn(employeeDateBadgeClass, "shrink-0")}>
        <div
          className={cn(
            "px-1 py-0.5 text-[9px] font-bold tracking-wide uppercase",
            isToday
              ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
              : "bg-primary/10 text-primary",
          )}
        >
          {format(eventDate, "MMM")}
        </div>
        <div className="flex min-h-[1.75rem] items-center justify-center py-0.5 text-base font-bold tabular-nums leading-none text-foreground">
          {format(eventDate, "d")}
        </div>
      </div>
    </li>
  );
}

export function EmployeeUpcomingEvents({
  events,
  referenceDate,
  className,
}: {
  events: EmployeeUpcomingEvent[];
  referenceDate: string;
  className?: string;
}) {
  return (
    <EmployeeSectionCard
      title="Celebrations & This Week"
      description="Highlights for today and this week."
      className={cn("flex h-full min-h-0 flex-col", className)}
      bodyClassName="flex flex-col min-h-0 flex-1 overflow-y-auto pr-1"
    >
      {events.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {events.map((event) =>
            event.type === "birthday" ? (
              <BirthdayEventRow
                key={event.id}
                event={event}
                referenceDate={referenceDate}
              />
            ) : (
              <HolidayEventRow
                key={event.id}
                event={event}
                referenceDate={referenceDate}
              />
            ),
          )}
        </ul>
      ) : (
        <div className="flex h-full min-h-[7rem] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/15 p-5 text-center dark:bg-white/[0.02]">
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Sparkles className="size-4" />
          </span>
          <p className="mt-2 text-xs font-semibold text-foreground">
            Nothing to celebrate this week
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            We&apos;ll highlight birthdays and holidays here when they come up.
          </p>
        </div>
      )}
    </EmployeeSectionCard>
  );
}
