"use client";

import { useRouter } from "next/navigation";

import { LeaveCalendarView } from "@/components/leave/leave-calendar-view";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import type {
  LeaveCalendarEntry,
  LeaveHolidayEntry,
} from "@/types/leave";

type LeaveCalendarShellProps = {
  leaves: LeaveCalendarEntry[];
  holidays: LeaveHolidayEntry[];
  month: number;
  year: number;
};

export function LeaveCalendarShell({
  leaves,
  holidays,
  month,
  year,
}: LeaveCalendarShellProps) {
  const router = useRouter();

  const handleMonthChange = (nextMonth: number, nextYear: number) => {
    const params = new URLSearchParams();
    params.set("month", String(nextMonth));
    params.set("year", String(nextYear));
    router.push(`${LEAVE_ROUTES.calendar}?${params.toString()}`);
  };

  return (
    <LeaveCalendarView
      leaves={leaves}
      holidays={holidays}
      month={month}
      year={year}
      onMonthChange={handleMonthChange}
    />
  );
}
