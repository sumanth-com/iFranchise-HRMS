"use client";

import { LeaveCalendarView } from "@/components/leave/leave-calendar-view";
import type { LeaveCalendarEntry, LeaveHolidayEntry } from "@/types/leave";
import type { LeaveCalendarContext } from "@/lib/leave/services/leave-calendar-engine";

type Props = {
  month: number;
  year: number;
  leaves: LeaveCalendarEntry[];
  holidays: LeaveHolidayEntry[];
  calendar?: LeaveCalendarContext;
  isPending?: boolean;
  onMonthChange: (month: number, year: number) => void;
};

export function EmployeeLeaveCalendar({
  month,
  year,
  leaves,
  holidays,
  calendar,
  isPending = false,
  onMonthChange,
}: Props) {
  return (
    <section className="card-surface-static rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Leave Calendar</h2>
        {isPending ? (
          <span className="shrink-0 text-xs text-muted-foreground">Loading…</span>
        ) : null}
      </div>

      <LeaveCalendarView
        leaves={leaves}
        holidays={holidays}
        month={month}
        year={year}
        onMonthChange={onMonthChange}
        calendar={calendar}
        enableWeekView
        showYearPicker
        currentMonthOnly
        compact
        hideHalfDayMarkers
      />
    </section>
  );
}
