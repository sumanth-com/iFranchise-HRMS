import { differenceInCalendarDays, format, parseISO } from "date-fns";

import {
  EmployeeEmpty,
  EmployeeSectionCard,
} from "@/components/employee/dashboard/employee-module-primitives";
import type { EmployeeUpcomingEvent } from "@/types/employee-dashboard";

/** Maps a holiday to a festive glyph so each row reads at a glance. */
function holidayGlyph(name: string): string {
  const key = name.toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => key.includes(k));

  if (has("diwali", "deepavali")) return "🪔";
  if (has("christmas")) return "🎄";
  if (has("new year")) return "🎉";
  if (has("holi")) return "🎨";
  if (has("independence")) return "🇮🇳";
  if (has("republic")) return "🇮🇳";
  if (has("gandhi")) return "🕊️";
  if (has("eid", "ramzan", "bakrid", "milad", "muharram")) return "🌙";
  if (has("sankranti", "pongal")) return "🌾";
  if (has("ambedkar")) return "📘";
  if (has("buddha")) return "☸️";
  if (has("mahavir")) return "🙏";
  if (has("ram navami")) return "🚩";
  if (has("janmashtami", "krishna")) return "🦚";
  if (has("dussehra", "vijayadashami")) return "🏹";
  if (has("navratri", "durga")) return "🪔";
  if (has("guru nanak", "gurpurab")) return "🪯";
  if (has("good friday", "easter")) return "✝️";
  if (has("shivaratri", "shivratri")) return "🔱";
  if (has("ganesh", "vinayaka")) return "🐘";
  if (has("onam")) return "🌸";
  if (has("raksha", "rakhi")) return "🧵";
  return "📅";
}

function countdownLabel(date: string, referenceDate: string): string {
  const days = differenceInCalendarDays(parseISO(date), parseISO(referenceDate));
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}

export function EmployeeUpcomingEvents({
  events,
  referenceDate,
}: {
  events: EmployeeUpcomingEvent[];
  referenceDate: string;
}) {
  return (
    <EmployeeSectionCard
      title="Upcoming Holidays"
      description="Company and public holidays."
      className="h-full"
      bodyClassName="min-h-0 overflow-y-auto pr-1"
    >
      {events.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-lg leading-none">
                {holidayGlyph(event.title)}
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
