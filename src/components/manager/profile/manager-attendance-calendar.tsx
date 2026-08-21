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
import { ATTENDANCE_DISPLAY_STATUS_LABELS } from "@/lib/attendance/constants";
import type { AttendanceDisplayStatus } from "@/types/attendance";
import type { ManagerAttendanceCalendarDay } from "@/types/manager-self-attendance";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Number-only pills for attendance status (today / Sunday use full cell instead). */
const PILL_STYLES: Record<string, string> = {
  present: "bg-emerald-500 text-white",
  late: "bg-orange-400 text-white",
  absent: "bg-red-500 text-white",
  half_day: "bg-emerald-200 text-emerald-800",
  on_leave: "bg-violet-400 text-white",
  holiday: "bg-sky-400 text-white",
  week_off: "",
  on_request: "bg-amber-400 text-white",
};

const TOOLTIP_STYLES: Record<string, string> = {
  present: "border-emerald-600/30 bg-emerald-600 text-white",
  late: "border-orange-500/30 bg-orange-500 text-white",
  absent: "border-red-600/30 bg-red-600 text-white",
  half_day: "border-emerald-500/30 bg-emerald-500 text-white",
  on_leave: "border-violet-500/30 bg-violet-500 text-white",
  holiday: "border-sky-500/30 bg-sky-500 text-white",
  week_off: "border-border bg-muted-foreground text-white",
  on_request: "border-amber-500/30 bg-amber-500 text-white",
  today: "border-emerald-700/30 bg-emerald-600 text-white",
};

const LEGEND = [
  { key: "present", label: "Present", className: "bg-emerald-500" },
  { key: "late", label: "Late", className: "bg-orange-400" },
  { key: "absent", label: "Absent", className: "bg-red-500" },
  { key: "half_day", label: "Half Day", className: "bg-emerald-200" },
  { key: "on_leave", label: "Leave", className: "bg-violet-400" },
  { key: "holiday", label: "Holiday", className: "bg-sky-400" },
  { key: "week_off", label: "Weekend off", className: "bg-muted-foreground/25" },
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
  tone: keyof typeof TOOLTIP_STYLES;
} | null {
  if (day.holidayName) {
    return { label: day.holidayName, tone: "holiday" };
  }
  if (day.leaveTypeName) {
    return { label: day.leaveTypeName, tone: "on_leave" };
  }
  if (day.isToday) {
    return { label: "Today", tone: "today" };
  }
  if (day.status) {
    const label = ATTENDANCE_DISPLAY_STATUS_LABELS[day.status as AttendanceDisplayStatus];
    if (label && label !== "—") {
      return { label, tone: day.status };
    }
  }
  if (day.inMonth && getDay(parseISO(day.date)) === 0) {
    return { label: "Weekend", tone: "week_off" };
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

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const maxYear = disableFuture ? current : current + 2;
    const startYear = current - 2;
    return Array.from(
      { length: maxYear - startYear + 1 },
      (_, index) => startYear + index,
    );
  }, [disableFuture]);

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
      disableFuture &&
      (next.getFullYear() > currentYear ||
        (next.getFullYear() === currentYear && next.getMonth() + 1 > currentMonth))
    ) {
      return;
    }
    onMonthChange(next.getMonth() + 1, next.getFullYear());
  }

  const canGoForward =
    !disableFuture ||
    year < currentYear ||
    (year === currentYear && month < currentMonth);

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
        "attendance-wave-surface card-surface-static flex h-full min-h-[28rem] flex-col rounded-2xl border bg-card p-4 shadow-sm",
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
            className="size-8 shrink-0"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => shiftMonth(1)}
            disabled={!canGoForward}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
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
            const isSunday = getDay(parseISO(live.date)) === 0;
            const pillClass =
              !live.isToday && live.inMonth && live.status
                ? PILL_STYLES[live.status]
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
                  live.isToday &&
                    "attendance-day-today bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-700 ring-offset-2 ring-offset-background dark:ring-offset-[#060914]",
                  !live.isToday &&
                    live.inMonth &&
                    isSunday &&
                    "bg-muted/80 text-muted-foreground dark:bg-white/[0.06] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
                  isSelected &&
                    !live.isToday &&
                    "ring-2 ring-primary/70 ring-offset-1 dark:ring-white/25 dark:ring-offset-[#060914]",
                  live.inMonth &&
                    !live.isToday &&
                    "hover:bg-white/10",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-full",
                    live.isToday && "text-white",
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
