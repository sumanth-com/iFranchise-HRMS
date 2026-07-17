import { format, parseISO } from "date-fns";
import { Cake, PartyPopper, Plane } from "lucide-react";

import {
  EmployeeEmpty,
  EmployeeSectionCard,
} from "@/components/employee/dashboard/employee-module-primitives";
import { cn } from "@/lib/utils";
import type {
  EmployeeUpcomingEvent,
  EmployeeUpcomingEventType,
} from "@/types/employee-dashboard";

const EVENT_STYLES: Record<
  EmployeeUpcomingEventType,
  { icon: typeof Cake; className: string }
> = {
  holiday: { icon: Plane, className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  birthday: { icon: Cake, className: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  anniversary: {
    icon: PartyPopper,
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
};

export function EmployeeUpcomingEvents({ events }: { events: EmployeeUpcomingEvent[] }) {
  return (
    <EmployeeSectionCard
      title="Upcoming Holidays & Birthdays"
      description="Company holidays and birthdays across the team."
    >
      {events.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {events.map((event) => {
            const style = EVENT_STYLES[event.type];
            const Icon = style.icon;
            return (
              <li
                key={event.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", style.className)}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  {event.subtitle ? (
                    <p className="truncate text-[11px] text-muted-foreground">{event.subtitle}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {format(parseISO(event.date), "dd MMM")}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmployeeEmpty message="No upcoming holidays or birthdays." />
      )}
    </EmployeeSectionCard>
  );
}
