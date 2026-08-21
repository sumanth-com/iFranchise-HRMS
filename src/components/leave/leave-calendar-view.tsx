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
import { CalendarHeart, ChevronLeft, ChevronRight } from "lucide-react";
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
import { expandDateRange } from "@/lib/leave/services/leave-utils";
import {
  calculateLeaveDuration,
  classifyCalendarDay,
  DEFAULT_LEAVE_CALENDAR,
  type LeaveCalendarContext,
} from "@/lib/leave/services/leave-calendar-engine";
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
  /** Smaller calendar for self-service layouts. */
  compact?: boolean;
  calendar?: LeaveCalendarContext;
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
  compact = false,
  calendar = DEFAULT_LEAVE_CALENDAR,
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
  const cellMinHeight = isWeek
    ? compact
      ? "min-h-28"
      : "min-h-40"
    : compact
      ? "min-h-20"
      : "min-h-28";
  const maxVisibleLeaves = isWeek ? (compact ? 4 : 8) : compact ? 3 : 3;
  const gridMinWidth = compact ? "w-full" : "min-w-[44rem]";

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

  function leaveMarkLabel(leave: LeaveCalendarEntry) {
    if (compact) {
      const type = leave.leaveTypeName?.trim();
      if (type) {
        // Prefer a short pill label (e.g. "Casual Leave" → "Casual").
        return type.split(/\s+/)[0] ?? type;
      }
    }
    return leave.employeeName;
  }

  function leaveCellHighlight(dayLeaves: LeaveCalendarEntry[]) {
    if (dayLeaves.length === 0) return null;
    const hasPending = dayLeaves.some((leave) => leave.leaveStatus === "pending");
    const hasApproved = dayLeaves.some((leave) => leave.leaveStatus === "approved");
    if (hasPending && !hasApproved) {
      return "bg-amber-500/10 ring-1 ring-inset ring-amber-500/30";
    }
    if (hasApproved && !hasPending) {
      return "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/30";
    }
    if (hasPending && hasApproved) {
      return "bg-sky-500/10 ring-1 ring-inset ring-sky-500/25";
    }
    return "bg-primary/5 ring-1 ring-inset ring-primary/20";
  }

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

  const calendarWithHolidays = useMemo<LeaveCalendarContext>(
    () => ({
      ...calendar,
      holidays: Array.from(
        new Set([
          ...calendar.holidays,
          ...holidays.filter((item) => !item.isOptional).map((item) => item.holidayDate),
        ]),
      ),
    }),
    [calendar, holidays],
  );

  const sandwichDates = useMemo(() => {
    const dates = new Set<string>();
    leaves.forEach((leave) => {
      calculateLeaveDuration({
        startDate: leave.startDate,
        endDate: leave.endDate,
        isHalfDay: leave.isHalfDay,
        calendar: calendarWithHolidays,
      }).days.forEach((day) => {
        if (day.kind === "sandwich") dates.add(day.date);
      });
    });
    return dates;
  }, [leaves, calendarWithHolidays]);

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
          <h2
            className={cn(
              "min-w-[8rem] text-center font-semibold",
              compact ? "text-sm" : "text-lg",
            )}
          >
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

      <div className="card-surface-static overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <div className={gridMinWidth}>
            <div className="grid grid-cols-7 border-b bg-muted/40">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className={cn(
                    "px-1.5 py-1.5 text-center font-medium text-muted-foreground",
                    compact ? "text-[10px]" : "text-xs",
                  )}
                >
                  {compact ? label.slice(0, 3) : label}
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
            const dayClass = classifyCalendarDay(day.date, calendarWithHolidays);
            const isWeeklyHoliday = dayClass === "weekly_off";
            const isHalfDayCalendar = dayClass === "half_day";
            const sandwichOnDay = sandwichDates.has(day.date);
            const leaveHighlight =
              day.isCurrentMonth && dayLeaves.length > 0
                ? leaveCellHighlight(dayLeaves)
                : null;
            const holidayHighlight =
              Boolean(holiday) && day.isCurrentMonth && !leaveHighlight
                ? "bg-violet-500/10 ring-1 ring-inset ring-violet-500/25"
                : null;

            return (
              <div
                key={day.date}
                className={cn(
                  "border-b border-r last:border-r-0",
                  compact ? "p-1.5" : "p-2",
                  cellMinHeight,
                  !day.isCurrentMonth && "bg-muted/20 text-muted-foreground",
                  isWeeklyHoliday &&
                    day.isCurrentMonth &&
                    !leaveHighlight &&
                    !holidayHighlight &&
                    "bg-muted/30",
                  isHalfDayCalendar &&
                    day.isCurrentMonth &&
                    !leaveHighlight &&
                    !holidayHighlight &&
                    "bg-orange-500/10",
                  sandwichOnDay && day.isCurrentMonth && !leaveHighlight
                    ? "ring-1 ring-inset ring-sky-500/40"
                    : null,
                  holidayHighlight,
                  leaveHighlight,
                )}
              >
                <div className={cn("flex items-start justify-between gap-1", compact ? "mb-1" : "mb-2")}>
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      compact ? "text-xs" : "text-sm",
                      !day.isCurrentMonth && "text-muted-foreground",
                      (leaveHighlight || holidayHighlight) && "font-semibold",
                      holidayHighlight && "text-violet-700 dark:text-violet-300",
                    )}
                  >
                    {day.dayNumber}
                  </span>
                  {day.isCurrentMonth && isHalfDayCalendar && !holiday ? (
                    <span className="rounded bg-orange-500/15 px-1 py-px text-[9px] font-medium text-orange-700 dark:text-orange-300">
                      Half
                    </span>
                  ) : sandwichOnDay && day.isCurrentMonth && dayLeaves.length === 0 ? (
                    <span className="rounded bg-sky-500/15 px-1 py-px text-[9px] font-medium text-sky-800 dark:text-sky-300">
                      Sandwich
                    </span>
                  ) : null}
                </div>

                <div className={cn("flex flex-col", compact ? "gap-0.5" : "gap-1")}>
                  {holiday && day.isCurrentMonth ? (
                    <div
                      className={cn(
                        "flex min-w-0 items-center gap-1 text-violet-700 dark:text-violet-200",
                        compact ? "text-[10px]" : "text-xs",
                      )}
                      title={holiday.name}
                    >
                      <CalendarHeart
                        className={cn(
                          "shrink-0 text-violet-600 dark:text-violet-300",
                          compact ? "size-3" : "size-3.5",
                        )}
                        aria-hidden
                      />
                      <span className="truncate font-bold leading-tight">
                        {holiday.name}
                      </span>
                    </div>
                  ) : null}

                  {compact ? (
                    <div className="flex flex-wrap gap-0.5">
                      {dayLeaves.slice(0, maxVisibleLeaves).map((leave) => (
                        <span
                          key={`${day.date}-${leave.id}`}
                          className={cn(
                            "inline-flex max-w-full truncate rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white",
                            leave.isHalfDay
                              ? LEAVE_CALENDAR_LEGEND.halfDay.className
                              : LEAVE_STATUS_COLORS[leave.leaveStatus],
                          )}
                          title={`${leave.leaveTypeName} · ${leave.employeeName}`}
                        >
                          {leaveMarkLabel(leave)}
                        </span>
                      ))}
                      {dayLeaves.length > maxVisibleLeaves ? (
                        <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                          +{dayLeaves.length - maxVisibleLeaves}
                        </span>
                      ) : null}
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>
            );
          })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
