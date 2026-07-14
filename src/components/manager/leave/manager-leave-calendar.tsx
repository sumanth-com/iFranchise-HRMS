"use client";

import {
  addDays,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";

import { LeaveCalendarView } from "@/components/leave/leave-calendar-view";
import { Button } from "@/components/common/button";
import { LEAVE_CALENDAR_LEGEND } from "@/lib/leave/constants";
import { expandDateRange, isWeekendDate } from "@/lib/leave/services/leave-utils";
import type {
  LeaveCalendarEntry,
  LeaveHolidayEntry,
  LeaveStatus,
} from "@/types/leave";
import { cn } from "@/lib/utils";

type CalendarMode = "monthly" | "weekly";

type ManagerLeaveCalendarProps = {
  leaves: LeaveCalendarEntry[];
  holidays: LeaveHolidayEntry[];
  month: number;
  year: number;
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  onMonthChange: (month: number, year: number) => void;
  weekStart?: string;
  onWeekChange?: (weekStart: string) => void;
};

const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  approved: LEAVE_CALENDAR_LEGEND.approved.className,
  pending: LEAVE_CALENDAR_LEGEND.pending.className,
  rejected: "bg-destructive/60",
  cancelled: "bg-muted-foreground/30",
  withdrawn: "bg-violet-500/60",
};

export function ManagerLeaveCalendar({
  leaves,
  holidays,
  month,
  year,
  mode,
  onModeChange,
  onMonthChange,
  weekStart,
  onWeekChange,
}: ManagerLeaveCalendarProps) {
  const anchorDate = weekStart
    ? parseISO(weekStart)
    : new Date(year, month - 1, 1);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      return {
        date: format(date, "yyyy-MM-dd"),
        label: format(date, "EEE d MMM"),
      };
    });
  }, [anchorDate]);

  const holidayMap = useMemo(() => {
    const map = new Map<string, LeaveHolidayEntry>();
    holidays.forEach((holiday) => map.set(holiday.holidayDate, holiday));
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

  function shiftWeek(direction: -1 | 1) {
    const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
    const next = addDays(start, direction * 7);
    onWeekChange?.(format(next, "yyyy-MM-dd"));
    onMonthChange(next.getMonth() + 1, next.getFullYear());
  }

  const weekLabel = `${format(weekDays[0].date, "d MMM")} – ${format(
    weekDays[6].date,
    "d MMM yyyy",
  )}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-1 w-fit">
        <Button
          size="sm"
          variant={mode === "monthly" ? "default" : "ghost"}
          onClick={() => onModeChange("monthly")}
        >
          Monthly
        </Button>
        <Button
          size="sm"
          variant={mode === "weekly" ? "default" : "ghost"}
          onClick={() => onModeChange("weekly")}
        >
          Weekly
        </Button>
      </div>

      {mode === "monthly" ? (
        <LeaveCalendarView
          leaves={leaves}
          holidays={holidays}
          month={month}
          year={year}
          onMonthChange={onMonthChange}
          currentMonthOnly
          showYearPicker
        />
      ) : (
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <Button variant="outline" size="icon-sm" onClick={() => shiftWeek(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="text-sm font-semibold">{weekLabel}</h2>
            <Button variant="outline" size="icon-sm" onClick={() => shiftWeek(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-7">
            {weekDays.map((day) => {
              const dayLeaves = leavesByDate.get(day.date) ?? [];
              const holiday = holidayMap.get(day.date);
              const weekend = isWeekendDate(day.date);

              return (
                <div
                  key={day.date}
                  className={cn(
                    "min-h-36 rounded-lg border p-2",
                    weekend && "bg-muted/30",
                    holiday && "border-violet-300 bg-violet-500/5",
                  )}
                >
                  <div className="mb-2">
                    <p className="text-xs font-medium">{day.label}</p>
                    {holiday ? (
                      <p className="truncate text-[10px] text-violet-700 dark:text-violet-300">
                        {holiday.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    {dayLeaves.map((leave) => (
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
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
