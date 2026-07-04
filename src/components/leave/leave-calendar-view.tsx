"use client";

import {
  addDays,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/common/button";
import { LEAVE_CALENDAR_LEGEND } from "@/lib/leave/constants";
import { expandDateRange, isWeekendDate } from "@/lib/leave/services/leave-utils";
import type {
  LeaveCalendarEntry,
  LeaveHolidayEntry,
  LeaveStatus,
} from "@/types/leave";
import { cn } from "@/lib/utils";

type LeaveCalendarViewProps = {
  leaves: LeaveCalendarEntry[];
  holidays: LeaveHolidayEntry[];
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
};

type DayCell = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  approved: LEAVE_CALENDAR_LEGEND.approved.className,
  pending: LEAVE_CALENDAR_LEGEND.pending.className,
  rejected: "bg-destructive/60",
  cancelled: "bg-muted-foreground/30",
  withdrawn: "bg-violet-500/60",
};

function buildCalendarDays(month: number, year: number): DayCell[] {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const gridStart = addDays(monthStart, -getDay(monthStart));
  const gridEnd = addDays(monthEnd, 6 - getDay(monthEnd));

  const days: DayCell[] = [];
  let current = gridStart;

  while (current <= gridEnd) {
    days.push({
      date: format(current, "yyyy-MM-dd"),
      dayNumber: current.getDate(),
      isCurrentMonth: current.getMonth() === month - 1,
    });
    current = addDays(current, 1);
  }

  return days;
}

export function LeaveCalendarView({
  leaves,
  holidays,
  month,
  year,
  onMonthChange,
}: LeaveCalendarViewProps) {
  const calendarDays = useMemo(
    () => buildCalendarDays(month, year),
    [month, year],
  );

  const holidayMap = useMemo(() => {
    const map = new Map<string, LeaveHolidayEntry>();
    holidays.forEach((holiday) => {
      map.set(holiday.holidayDate, holiday);
    });
    return map;
  }, [holidays]);

  const leavesByDate = useMemo(() => {
    const map = new Map<string, LeaveCalendarEntry[]>();

    leaves.forEach((leave) => {
      expandDateRange(leave.startDate, leave.endDate).forEach((date) => {
        const existing = map.get(date) ?? [];
        existing.push(leave);
        map.set(date, existing);
      });
    });

    return map;
  }, [leaves]);

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");

  const goToPreviousMonth = () => {
    if (month === 1) {
      onMonthChange(12, year - 1);
      return;
    }
    onMonthChange(month - 1, year);
  };

  const goToNextMonth = () => {
    if (month === 12) {
      onMonthChange(1, year + 1);
      return;
    }
    onMonthChange(month + 1, year);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="min-w-[10rem] text-center text-lg font-semibold">
            {monthLabel}
          </h2>
          <Button variant="outline" size="icon-sm" onClick={goToNextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {Object.entries(LEAVE_CALENDAR_LEGEND).map(([key, item]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full", item.className)} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const holiday = holidayMap.get(day.date);
            const dayLeaves = leavesByDate.get(day.date) ?? [];
            const isWeekend = isWeekendDate(day.date);

            return (
              <div
                key={day.date}
                className={cn(
                  "min-h-28 border-b border-r p-2 last:border-r-0",
                  !day.isCurrentMonth && "bg-muted/20 text-muted-foreground",
                  isWeekend && day.isCurrentMonth && "bg-muted/30",
                  holiday && "bg-violet-500/5",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      !day.isCurrentMonth && "text-muted-foreground",
                    )}
                  >
                    {day.dayNumber}
                  </span>
                  {holiday ? (
                    <span
                      className="truncate text-[10px] font-medium text-violet-700 dark:text-violet-300"
                      title={holiday.name}
                    >
                      {holiday.name}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1">
                  {dayLeaves.slice(0, 3).map((leave) => (
                    <div
                      key={`${day.date}-${leave.id}`}
                      className={cn(
                        "truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white",
                        leave.isHalfDay
                          ? LEAVE_CALENDAR_LEGEND.halfDay.className
                          : LEAVE_STATUS_COLORS[leave.leaveStatus],
                      )}
                      title={`${leave.employeeName} · ${leave.leaveTypeName}`}
                    >
                      {leave.employeeName}
                    </div>
                  ))}
                  {dayLeaves.length > 3 ? (
                    <p className="text-[10px] text-muted-foreground">
                      +{dayLeaves.length - 3} more
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
