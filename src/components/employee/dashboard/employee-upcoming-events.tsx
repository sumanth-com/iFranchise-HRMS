"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Cake, Sparkles } from "lucide-react";

import { EmployeeSectionCard } from "@/components/employee/dashboard/employee-module-primitives";
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

/** Full-bleed celebration tile that fills its flex slot (no page scroll). */
function FeaturedEventCard({
  event,
  referenceDate,
  compact = false,
  className,
}: {
  event: EmployeeUpcomingEvent;
  referenceDate: string;
  compact?: boolean;
  className?: string;
}) {
  const eventDate = parseISO(event.date);
  const timing = countdownLabel(event.date, referenceDate);
  const isToday = timing === "Today";
  const isBirthday = event.type === "birthday";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-xl text-center",
        compact ? "px-3 py-2" : "px-5 py-5",
        isBirthday
          ? "bg-gradient-to-b from-rose-500/[0.07] to-rose-500/[0.02] ring-1 ring-rose-500/15"
          : "bg-gradient-to-b from-violet-500/[0.07] to-violet-500/[0.02] ring-1 ring-violet-500/15",
        className,
      )}
    >
      {isBirthday ? (
        <div className="relative shrink-0">
          <EmployeeAvatar
            firstName={event.firstName || event.title}
            lastName={event.lastName || ""}
            profileImagePath={event.profileImagePath}
            signedUrl={event.avatarUrl}
            className={cn(
              "rounded-2xl ring-2 ring-rose-500/25",
              compact ? "size-11" : "size-16 sm:size-[4.5rem]",
            )}
          />
          {isToday ? (
            <span
              className={cn(
                "absolute flex items-center justify-center rounded-full bg-rose-500 text-white shadow-sm",
                compact
                  ? "-right-1 -bottom-1 size-5"
                  : "-right-1.5 -bottom-1.5 size-6",
              )}
            >
              <Cake className={compact ? "size-3" : "size-3.5"} />
            </span>
          ) : null}
        </div>
      ) : (
        <span
          className={cn(
            "celebration-glyph flex shrink-0 items-center justify-center leading-none",
            compact
              ? "size-12 text-[2.5rem]"
              : "size-[7.5rem] text-[5rem] sm:size-[9rem] sm:text-[6rem]",
          )}
        >
          <HolidayGlyph name={event.title} className="text-[inherit] leading-none" />
        </span>
      )}

      <span
        className={cn(
          "inline-flex items-center rounded-full font-bold tracking-wide uppercase",
          compact
            ? "mt-2 px-2 py-0.5 text-[9px] sm:text-[10px]"
            : "mt-3.5 px-2.5 py-0.5 text-[10px]",
          isBirthday
            ? "bg-rose-500/15 text-rose-700 dark:bg-rose-400/20 dark:text-rose-300"
            : "bg-violet-500/12 text-violet-700 dark:bg-violet-400/20 dark:text-violet-300",
        )}
      >
        {isBirthday && !isToday ? "Birthday" : timing}
      </span>

      <p
        className={cn(
          "line-clamp-1 font-semibold tracking-tight text-foreground",
          compact ? "mt-1 text-sm" : "mt-2.5 text-base sm:text-lg",
        )}
      >
        {event.title}
      </p>

      {isBirthday ? (
        <p
          className={cn(
            "line-clamp-1 text-muted-foreground",
            compact ? "mt-0.5 text-[10px] sm:text-[11px]" : "mt-1 text-xs",
          )}
        >
          {isToday ? "Celebrating birthday today!" : `Birthday · ${timing}`}
        </p>
      ) : event.subtitle && compact ? (
        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground sm:text-[11px]">
          {event.subtitle}
        </p>
      ) : null}

      <p
        className={cn(
          "font-medium tracking-wide text-muted-foreground/75 tabular-nums uppercase",
          compact ? "mt-1 text-[10px]" : "mt-3 text-[11px]",
        )}
      >
        {format(eventDate, compact ? "EEE, d MMM yyyy" : "EEEE, d MMM yyyy")}
      </p>
    </div>
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
  // Keep the panel viewport-bound: at most two full cards share the height.
  const visible = events.slice(0, 2);
  const compact = visible.length === 2;

  return (
    <EmployeeSectionCard
      title="Celebrations & This Week"
      description="Highlights for today and this week."
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {visible.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {visible.map((event) => (
            <FeaturedEventCard
              key={event.id}
              event={event}
              referenceDate={referenceDate}
              compact={compact}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/15 p-5 text-center dark:bg-white/[0.02]">
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
