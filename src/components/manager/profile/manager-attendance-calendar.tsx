"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Fragment, useMemo } from "react";

import { Button } from "@/components/common/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { resolveAttendanceUiDisplay } from "@/lib/attendance/manual-status";
import { getHrmsYears, HRMS_YEAR_MAX, HRMS_YEAR_MIN } from "@/lib/date/hrms-year";
import type { ManagerAttendanceCalendarDay } from "@/types/manager-self-attendance";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Number-only pills for attendance status (today / Sunday use full cell instead). */
const PILL_STYLES: Record<string, string> = {
  present: "bg-emerald-500 text-white",
  casual_leave: "bg-violet-500 text-white",
  earned_leave: "bg-indigo-500 text-white",
  lop: "bg-rose-500 text-white",
  absent: "bg-red-500 text-white",
  holiday: "bg-muted/80 text-muted-foreground dark:bg-white/[0.06] dark:text-slate-200",
  on_request: "bg-amber-400 text-white",
};

const TOOLTIP_STYLES: Record<string, string> = {
  present: "border-emerald-600/30 bg-emerald-600 text-white",
  casual_leave: "border-violet-500/30 bg-violet-500 text-white",
  earned_leave: "border-indigo-500/30 bg-indigo-500 text-white",
  lop: "border-rose-500/30 bg-rose-500 text-white",
  absent: "border-red-600/30 bg-red-600 text-white",
  holiday: "border-border bg-muted-foreground text-white",
  on_request: "border-amber-500/30 bg-amber-500 text-white",
  today: "border-border bg-muted-foreground text-white",
};

const LEGEND = [
  { key: "present", label: "Present", className: "bg-emerald-500" },
  { key: "absent", label: "Absent", className: "bg-red-500" },
  { key: "casual_leave", label: "Casual Leave", className: "bg-violet-500" },
  { key: "earned_leave", label: "Earned Leave", className: "bg-indigo-500" },
  { key: "lop", label: "LOP", className: "bg-rose-500" },
  { key: "holiday", label: "Holiday", className: "bg-muted/80 dark:bg-white/15" },
];

type Props = {
  days: ManagerAttendanceCalendarDay[];
  month: number;
  year: number;
  selectedDate: string | null;
  onMonthChange: (month: number, year: number) => void;
  onSelectDate: (date: string) => void;
  className?: string;
  disableFuture?: boolean;
};

function getCalendarDayTooltip(day: ManagerAttendanceCalendarDay): {
  label: string;
  tone: string;
} | null {
  if (day.status === "on_request") {
    return { label: day.isToday ? "On Request · Today" : "On Request", tone: "on_request" };
  }
  if (day.status) {
    const display = resolveAttendanceUiDisplay(day.status, day.statusNotes);
    return {
      label: day.isToday ? `${display.label} · Today` : display.label,
      tone: display.key,
    };
  }
  if (day.holidayName) {
    return { label: day.holidayName, tone: "holiday" };
  }
  if (day.leaveTypeName) {
    return { label: day.leaveTypeName, tone: "casual_leave" };
  }
  if (day.isToday) {
    return { label: "Today", tone: "today" };
  }
  if (day.inMonth && getDay(parseISO(day.date)) === 0) {
    return { label: "Holiday", tone: "holiday" };
  }
  return null;
}

export function ManagerAttendanceCalendar({
  days,
  month,
  year,
  selectedDate,
  onMonthChange,
  onSelectDate,
  className,
  disableFuture = false,
}: Props) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const yearOptions = useMemo(() => getHrmsYears(), []);

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");

  function goToday() {
    const now = new Date();
    onMonthChange(now.getMonth() + 1, now.getFullYear());
    onSelectDate(format(now, "yyyy-MM-dd"));
  }

  function shiftMonth(direction: -1 | 1) {
    const next =
      direction === 1
        ? addMonths(new Date(year, month - 1, 1), 1)
        : subMonths(new Date(year, month - 1, 1), 1);
    if (
      next.getFullYear() < HRMS_YEAR_MIN ||
      next.getFullYear() > HRMS_YEAR_MAX ||
      (disableFuture &&
        (next.getFullYear() > currentYear ||
          (next.getFullYear() === currentYear && next.getMonth() + 1 > currentMonth)))
    ) {
      return;
    }
    onMonthChange(next.getMonth() + 1, next.getFullYear());
  }

  const canGoForward =
    year < HRMS_YEAR_MAX &&
    (!disableFuture ||
      year < currentYear ||
      (year === currentYear && month < currentMonth));

  const dayMap = useMemo(() => {
    const map = new Map<string, ManagerAttendanceCalendarDay>();
    days.forEach((day) => map.set(day.date, day));
    return map;
  }, [days]);

  const gridDays = useMemo(() => {
    if (days.length > 0) return days;
    const start = startOfMonth(new Date(year, month - 1, 1));
    const end = endOfMonth(start);
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - getDay(start));
    const gridEnd = new Date(end);
    gridEnd.setDate(end.getDate() + (6 - getDay(end)));
    return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((day) => ({
      date: format(day, "yyyy-MM-dd"),
      dayOfMonth: day.getDate(),
      inMonth: day.getMonth() === month - 1,
      isToday: false,
      isFuture: false,
      status: null,
      statusNotes: null,
      attendanceId: null,
      checkInAt: null,
      checkOutAt: null,
      workHours: 0,
      holidayName: null,
      leaveTypeName: null,
    }));
  }, [days, month, year]);

  return (
    <section
      className={cn(
        "attendance-wave-surface card-surface-static flex h-full min-h-[28rem] flex-col rounded-2xl border bg-card p-4 shadow-sm max-xl:h-auto max-xl:min-h-0",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight">
            {monthLabel}
          </h2>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            Monthly attendance overview
          </p>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 px-2.5 text-xs"
            onClick={goToday}
          >
            Today
          </Button>
          <Select
            value={String(year)}
            onValueChange={(value) => {
              if (!value) return;
              onMonthChange(month, Number.parseInt(value, 10));
            }}
          >
            <SelectTrigger className="h-8 w-[4.75rem] shrink-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(month)}
            onValueChange={(value) => {
              if (!value) return;
              onMonthChange(Number.parseInt(value, 10), year);
            }}
          >
            <SelectTrigger className="h-8 w-[6.75rem] shrink-0 text-xs">
              <SelectValue placeholder="Month">
                {(value) =>
                  value
                    ? format(
                        new Date(
                          year,
                          Number.parseInt(String(value), 10) - 1,
                          1,
                        ),
                        "MMMM",
                      )
                    : "Month"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, index) => {
                const monthValue = index + 1;
                const isFutureMonth =
                  disableFuture &&
                  year === currentYear &&
                  monthValue > currentMonth;
                return (
                  <SelectItem
                    key={monthValue}
                    value={String(monthValue)}
                    disabled={isFutureMonth}
                  >
                    {format(new Date(2026, index, 1), "MMMM")}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 border-border/80 bg-background text-foreground shadow-sm hover:bg-muted hover:text-foreground disabled:opacity-40"
            onClick={() => shiftMonth(-1)}
            type="button"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" strokeWidth={2.25} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 border-border/80 bg-background text-foreground shadow-sm hover:bg-muted hover:text-foreground disabled:opacity-40"
            onClick={() => shiftMonth(1)}
            type="button"
            disabled={!canGoForward}
            aria-label="Next month"
            title={!canGoForward ? "You are on the latest month" : "Next month"}
          >
            <ChevronRight className="size-4" strokeWidth={2.25} />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="mt-1 grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1.5">
          {gridDays.map((day) => {
            const live = dayMap.get(day.date) ?? day;
            const isSelected = selectedDate === live.date;
            const uiStatus =
              live.status && live.status !== "on_request" && live.status !== "upcoming"
                ? resolveAttendanceUiDisplay(live.status, live.statusNotes)
                : null;
            const isHolidayOrWeekend =
              uiStatus?.key === "holiday" ||
              live.status === "holiday" ||
              live.status === "week_off";
            // Status pill for any in-month day with a punch/leave status — including today.
            // Do not force Present green on today; unmarked days stay neutral.
            const pillClass =
              live.inMonth && live.status === "on_request"
                ? PILL_STYLES.on_request
                : live.inMonth && uiStatus && !isHolidayOrWeekend
                  ? PILL_STYLES[uiStatus.key]
                  : null;
            const tooltip = live.inMonth ? getCalendarDayTooltip(live) : null;

            const dayButton = (
              <button
                type="button"
                disabled={!live.inMonth}
                onClick={() => onSelectDate(live.date)}
                className={cn(
                  "attendance-day-cell flex min-h-0 w-full items-center justify-center rounded-xl text-sm font-medium transition-[background-color,box-shadow,color] duration-150",
                  !live.inMonth && "pointer-events-none opacity-25",
                  live.inMonth &&
                    isHolidayOrWeekend &&
                    "bg-muted/80 text-muted-foreground dark:bg-white/[0.06] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
                  // Today marker: ring only — fill comes from status pill when checked in.
                  live.isToday &&
                    "attendance-day-today shadow-sm ring-2 ring-offset-2 ring-offset-background dark:ring-offset-[#060914]",
                  live.isToday &&
                    uiStatus?.key === "present" &&
                    "ring-emerald-700",
                  live.isToday &&
                    uiStatus?.key === "absent" &&
                    "ring-red-600",
                  live.isToday &&
                    uiStatus?.key === "lop" &&
                    "ring-rose-600",
                  live.isToday &&
                    (uiStatus?.key === "casual_leave" ||
                      uiStatus?.key === "earned_leave") &&
                    "ring-violet-600",
                  live.isToday &&
                    !pillClass &&
                    !isHolidayOrWeekend &&
                    "ring-muted-foreground/40",
                  isSelected &&
                    !live.isToday &&
                    "ring-2 ring-primary/70 ring-offset-1 dark:ring-white/25 dark:ring-offset-[#060914]",
                  live.inMonth &&
                    !live.isToday &&
                    !pillClass &&
                    "hover:bg-white/10",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-full",
                    pillClass,
                  )}
                >
                  {live.dayOfMonth}
                </span>
              </button>
            );

            if (!tooltip) {
              return <Fragment key={live.date}>{dayButton}</Fragment>;
            }

            return (
              <Tooltip key={live.date}>
                <TooltipTrigger render={dayButton} />
                <TooltipContent
                  side="top"
                  sideOffset={6}
                  hideArrow
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-md",
                    TOOLTIP_STYLES[tooltip.tone] ?? TOOLTIP_STYLES.present,
                  )}
                >
                  {tooltip.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap gap-x-3 gap-y-1.5 border-t border-border/60 pt-3">
        {LEGEND.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span className={cn("size-2.5 rounded-full", item.className)} />
            {item.label}
          </div>
        ))}
      </div>
    </section>
  );
}
