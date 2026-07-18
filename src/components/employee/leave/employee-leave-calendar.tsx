"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { LeaveCalendarView } from "@/components/leave/leave-calendar-view";
import { getEmployeeLeaveCalendarAction } from "@/lib/employee/actions/employee-leave-actions";
import type { LeaveCalendarEntry, LeaveHolidayEntry } from "@/types/leave";

type Props = {
  initialMonth: number;
  initialYear: number;
  initialLeaves: LeaveCalendarEntry[];
  initialHolidays: LeaveHolidayEntry[];
};

export function EmployeeLeaveCalendar({
  initialMonth,
  initialYear,
  initialLeaves,
  initialHolidays,
}: Props) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [leaves, setLeaves] = useState(initialLeaves);
  const [holidays, setHolidays] = useState(initialHolidays);
  const [isPending, startTransition] = useTransition();

  function handleMonthChange(nextMonth: number, nextYear: number) {
    setMonth(nextMonth);
    setYear(nextYear);
    startTransition(async () => {
      try {
        const data = await getEmployeeLeaveCalendarAction(nextMonth, nextYear);
        setLeaves(data.leaves);
        setHolidays(data.holidays);
      } catch {
        toast.error("Could not load the calendar for that month.");
      }
    });
  }

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Leave Calendar</h2>
          <p className="text-xs text-muted-foreground">
            Your leaves and company holidays — switch between month and week.
          </p>
        </div>
        {isPending ? (
          <span className="shrink-0 text-xs text-muted-foreground">Loading…</span>
        ) : null}
      </div>

      <LeaveCalendarView
        leaves={leaves}
        holidays={holidays}
        month={month}
        year={year}
        onMonthChange={handleMonthChange}
        enableWeekView
        showYearPicker
        currentMonthOnly
      />
    </section>
  );
}
