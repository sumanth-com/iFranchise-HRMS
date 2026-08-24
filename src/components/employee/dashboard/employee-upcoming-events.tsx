import { differenceInCalendarDays, format, parseISO } from "date-fns";

import {
  EmployeeEmpty,
  EmployeeSectionCard,
  employeeDateBadgeClass,
  employeeEventRowClass,
} from "@/components/employee/dashboard/employee-module-primitives";
import { HolidayGlyph } from "@/components/employee/dashboard/holiday-glyph";
import { cn } from "@/lib/utils";
import type { EmployeeUpcomingEvent } from "@/types/employee-dashboard";

function countdownLabel(date: string, referenceDate: string): string {
  const days = differenceInCalendarDays(parseISO(date), parseISO(referenceDate));
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}

function HolidayEventRow({
  event,
  referenceDate,
}: {
  event: EmployeeUpcomingEvent;
  referenceDate: string;
}) {
  const eventDate = parseISO(event.date);

  return (
    <li className={employeeEventRowClass}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/40 dark:border dark:border-border/40 dark:bg-white/[0.04]">
        <HolidayGlyph name={event.title} className="text-2xl leading-none" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
        {event.subtitle ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{event.subtitle}</p>
        ) : null}
        <p className="mt-1 text-[11px] font-medium text-primary/80">
          {countdownLabel(event.date, referenceDate)}
        </p>
      </div>

      <div className={cn(employeeDateBadgeClass, "shrink-0")}>
        <div className="bg-primary/10 px-1 py-0.5 text-[9px] font-bold tracking-wide text-primary uppercase">
          {format(eventDate, "MMM")}
        </div>
        <div className="flex min-h-[1.85rem] items-center justify-center py-0.5 text-base font-bold tabular-nums leading-none text-foreground">
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
      title="Upcoming Holidays"
      description="Company and public holidays."
      className={cn("flex h-full min-h-0 flex-col", className)}
      bodyClassName="min-h-0 flex-1 overflow-y-auto pr-1"
    >
      {events.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {events.map((event) => (
            <HolidayEventRow key={event.id} event={event} referenceDate={referenceDate} />
          ))}
        </ul>
      ) : (
        <EmployeeEmpty message="No upcoming holidays." />
      )}
    </EmployeeSectionCard>
  );
}
