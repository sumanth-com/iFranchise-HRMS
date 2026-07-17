"use client";

import {
  addDays,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/common/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
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
  /** When true, only days in the selected month are shown (empty cells for padding). */
  currentMonthOnly?: boolean;
  /** Show a year picker next to month navigation. */
  showYearPicker?: boolean;
  /** Hide the color legend under the calendar header. */
  hideLegend?: boolean;
  /** Enable a Month / Week view toggle (defaults to month-only). */
  enableWeekView?: boolean;
};

type CalendarViewMode = "month" | "week";

type DayCell = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

type CalendarCell = DayCell | null;

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

function buildCurrentMonthCalendarDays(month: number, year: number): CalendarCell[] {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const cells: CalendarCell[] = [];

  for (let index = 0; index < getDay(monthStart); index += 1) {
    cells.push(null);
  }

  let current = monthStart;
  while (current <= monthEnd) {
    cells.push({
      date: format(current, "yyyy-MM-dd"),
      dayNumber: current.getDate(),
      isCurrentMonth: true,
    });
    current = addDays(current, 1);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {Object.entries(LEAVE_CALENDAR_LEGEND).map(([key, item]) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-full", item.className)} />
          {item.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        Rejected
      </span>
    </div>
  );
}

export function LeaveCalendarView({
  leaves,
  holidays,
  month,
  year,
  onMonthChange,
  currentMonthOnly = false,
  showYearPicker = false,
  hideLegend = false,
  enableWeekView = false,
}: LeaveCalendarViewProps) {
  const [view, setView] = useState<CalendarViewMode>("month");
  const [anchor, setAnchor] = useState<string>(() =>
    format(startOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd"),
  );

  // Keep the week anchor aligned with the month/year the parent is loading.
  useEffect(() => {
    const current = parseISO(anchor);
    if (current.getFullYear() !== year || current.getMonth() !== month - 1) {
      setAnchor(format(startOfMonth(new Date(year, month - 1, 1)), "yyyy-MM-dd"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const monthCells = useMemo(
    () =>
      currentMonthOnly
        ? buildCurrentMonthCalendarDays(month, year)
        : buildCalendarDays(month, year),
    [currentMonthOnly, month, year],
  );

  const weekCells = useMemo<CalendarCell[]>(() => {
    const weekStart = startOfWeek(parseISO(anchor), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      return {
        date: format(date, "yyyy-MM-dd"),
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === month - 1,
      };
    });
  }, [anchor, month]);

  const isWeek = enableWeekView && view === "week";
  const calendarDays = isWeek ? weekCells : monthCells;
  const cellMinHeight = isWeek ? "min-h-40" : "min-h-28";
  const maxVisibleLeaves = isWeek ? 8 : 3;

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);
  }, []);

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

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM");

  const weekStart = startOfWeek(parseISO(anchor), { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  const weekLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "d")}`
      : `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`;

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

  const applyAnchor = (date: Date) => {
    setAnchor(format(date, "yyyy-MM-dd"));
    const nextMonth = date.getMonth() + 1;
    const nextYear = date.getFullYear();
    if (nextMonth !== month || nextYear !== year) {
      onMonthChange(nextMonth, nextYear);
    }
  };

  const goToPreviousWeek = () => applyAnchor(addDays(weekStart, -7));
  const goToNextWeek = () => applyAnchor(addDays(weekStart, 7));

  const handleViewChange = (nextView: CalendarViewMode) => {
    if (nextView === "week") {
      const today = new Date();
      const withinMonth =
        today.getFullYear() === year && today.getMonth() === month - 1;
      setAnchor(
        format(
          withinMonth ? today : startOfMonth(new Date(year, month - 1, 1)),
          "yyyy-MM-dd",
        ),
      );
    }
    setView(nextView);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={isWeek ? goToPreviousWeek : goToPreviousMonth}
            aria-label={isWeek ? "Previous week" : "Previous month"}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="min-w-[8rem] text-center text-lg font-semibold">
            {isWeek ? weekLabel : monthLabel}
          </h2>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={isWeek ? goToNextWeek : goToNextMonth}
            aria-label={isWeek ? "Next week" : "Next month"}
          >
            <ChevronRight className="size-4" />
          </Button>
          {showYearPicker ? (
            <Select
              value={String(year)}
              onValueChange={(value) => onMonthChange(month, Number(value))}
            >
              <SelectTrigger className="w-[6.5rem]" aria-label="Select year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((optionYear) => (
                  <SelectItem key={optionYear} value={String(optionYear)}>
                    {optionYear}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-muted-foreground">{year}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {enableWeekView ? (
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
              {(["month", "week"] as CalendarViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleViewChange(mode)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                    view === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          ) : null}
          {!hideLegend ? <CalendarLegend /> : null}
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
          {calendarDays.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={`empty-${index}`}
                  className={cn(
                    "border-b border-r bg-muted/10 last:border-r-0",
                    cellMinHeight,
                  )}
                />
              );
            }

            const holiday = holidayMap.get(day.date);
            const dayLeaves = leavesByDate.get(day.date) ?? [];
            const isWeekend = isWeekendDate(day.date);

            return (
              <div
                key={day.date}
                className={cn(
                  "border-b border-r p-2 last:border-r-0",
                  cellMinHeight,
                  !day.isCurrentMonth && "bg-muted/20 text-muted-foreground",
                  isWeekend && day.isCurrentMonth && "bg-muted/30",
                  holiday && day.isCurrentMonth && "bg-violet-500/5",
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
                  {dayLeaves.slice(0, maxVisibleLeaves).map((leave) => (
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
                  {dayLeaves.length > maxVisibleLeaves ? (
                    <p className="text-[10px] text-muted-foreground">
                      +{dayLeaves.length - maxVisibleLeaves} more
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
