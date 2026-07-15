import { format } from "date-fns";

import type { CeoAttendanceCalendarItem } from "@/types/ceo-attendance";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<CeoAttendanceCalendarItem["type"], string> = {
  holiday: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200",
  company_event:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  weekend: "border-muted bg-muted/40 text-muted-foreground",
  department_shutdown:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
};

const TYPE_LABELS: Record<CeoAttendanceCalendarItem["type"], string> = {
  holiday: "Public Holiday",
  company_event: "Company Event",
  weekend: "Weekend",
  department_shutdown: "Department Shutdown",
};

export function CeoAttendanceCalendar({
  calendar,
}: {
  calendar: CeoAttendanceCalendarItem[];
}) {
  const holidays = calendar.filter((item) => item.type === "holiday");
  const events = calendar.filter((item) => item.type === "company_event");
  const weekends = calendar.filter((item) => item.type === "weekend");
  const shutdowns = calendar.filter((item) => item.type === "department_shutdown");

  const groups = [
    { title: "Public Holidays", items: holidays },
    { title: "Company Events", items: events },
    { title: "Weekends", items: weekends.slice(0, 10) },
    { title: "Department Shutdowns", items: shutdowns },
  ];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Company Calendar</h2>
        <p className="text-xs text-muted-foreground">
          Holidays, company events, weekends, and department-specific closures.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {groups.map((group) => (
          <section key={group.title} className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">{group.title}</h3>
            {group.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">None this month.</p>
            ) : (
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm",
                      TYPE_STYLES[item.type],
                    )}
                  >
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs opacity-80">
                      {format(new Date(item.date), "d MMM yyyy")} ·{" "}
                      {TYPE_LABELS[item.type]}
                    </p>
                    {item.meta ? (
                      <p className="mt-1 text-xs opacity-70">{item.meta}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
