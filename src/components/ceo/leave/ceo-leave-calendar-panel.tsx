"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { LeaveCalendarView } from "@/components/leave/leave-calendar-view";
import { fetchCeoLeaveCalendarAction } from "@/lib/ceo/actions/ceo-leave-actions";
import type { CeoLeaveCalendar } from "@/types/ceo-leave";

export function CeoLeaveCalendarPanel({ initial }: { initial: CeoLeaveCalendar }) {
  const [calendar, setCalendar] = useState<CeoLeaveCalendar>(initial);
  const [, startTransition] = useTransition();

  const handleMonthChange = (month: number, year: number) => {
    startTransition(async () => {
      const result = await fetchCeoLeaveCalendarAction(month, year);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setCalendar(result.data);
    });
  };

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Leave Calendar</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Who is on leave across the organization — switch between month and week.
        </p>
      </div>
      <LeaveCalendarView
        leaves={calendar.leaves}
        holidays={calendar.holidays}
        month={calendar.month}
        year={calendar.year}
        onMonthChange={handleMonthChange}
        currentMonthOnly
        showYearPicker
        enableWeekView
      />
    </section>
  );
}
