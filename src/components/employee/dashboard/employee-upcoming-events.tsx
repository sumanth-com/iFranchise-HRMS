import { differenceInCalendarDays, format, parseISO } from "date-fns";

import {
  EmployeeEmpty,
  EmployeeSectionCard,
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
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                <HolidayGlyph name={event.title} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{event.title}</p>
                {event.subtitle ? (
                  <p className="truncate text-[11px] text-muted-foreground">{event.subtitle}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold">
                  {format(parseISO(event.date), "dd MMM")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {countdownLabel(event.date, referenceDate)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmployeeEmpty message="No upcoming holidays." />
      )}
    </EmployeeSectionCard>
  );
}
