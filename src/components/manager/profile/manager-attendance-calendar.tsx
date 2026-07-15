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
import { useMemo } from "react";

import { Button } from "@/components/common/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import type { ManagerAttendanceCalendarDay } from "@/types/manager-self-attendance";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Number-only pills for attendance status (today / Sunday use full cell instead). */
const PILL_STYLES: Record<string, string> = {
  present: "bg-emerald-500 text-white",
  late: "bg-orange-400 text-white",
  absent: "bg-muted-foreground/25 text-muted-foreground",
  half_day: "bg-emerald-200 text-emerald-800",
  on_leave: "bg-violet-400 text-white",
  holiday: "bg-sky-400 text-white",
  week_off: "",
};

const LEGEND = [
  { key: "present", label: "Present", className: "bg-emerald-500" },
  { key: "late", label: "Late", className: "bg-orange-400" },
  { key: "absent", label: "Absent", className: "bg-muted-foreground/35" },
  { key: "half_day", label: "Half day (Sat)", className: "bg-emerald-200" },
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
};

export function ManagerAttendanceCalendar({
  days,
  month,
  year,
  selectedDate,
  onMonthChange,
  onSelectDate,
  className,
}: Props) {
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => current - 2 + index);
  }, []);

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
    onMonthChange(next.getMonth() + 1, next.getFullYear());
  }

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
        "flex h-full min-h-[28rem] flex-col rounded-2xl border bg-card p-4 shadow-sm",
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
              {Array.from({ length: 12 }, (_, index) => (
                <SelectItem key={index + 1} value={String(index + 1)}>
                  {format(new Date(2026, index, 1), "MMMM")}
                </SelectItem>
              ))}
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

            return (
              <button
                key={live.date}
                type="button"
                disabled={!live.inMonth}
                onClick={() => onSelectDate(live.date)}
                className={cn(
                  "flex min-h-0 items-center justify-center rounded-xl text-sm font-medium transition",
                  !live.inMonth && "pointer-events-none opacity-25",
                  live.isToday &&
                    "bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-700 ring-offset-2",
                  !live.isToday &&
                    live.inMonth &&
                    isSunday &&
                    "bg-muted/80 text-muted-foreground",
                  isSelected &&
                    !live.isToday &&
                    "ring-2 ring-primary/70 ring-offset-1",
                )}
                title={
                  live.holidayName ||
                  live.leaveTypeName ||
                  live.status ||
                  live.date
                }
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
