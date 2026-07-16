"use client";

import { Home, Loader2, TrendingDown, Users } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { formatCeoPercent } from "@/components/ceo/ceo-module-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { fetchCeoAttendanceExceptionsAction } from "@/lib/ceo/actions/ceo-attendance-actions";
import type {
  CeoAttendanceExceptions,
  CeoAttendanceKpis,
  CeoAttendanceOverview,
} from "@/types/ceo-attendance";
import { cn } from "@/lib/utils";

const MONTH_LABELS: Record<string, string> = {
  "1": "January",
  "2": "February",
  "3": "March",
  "4": "April",
  "5": "May",
  "6": "June",
  "7": "July",
  "8": "August",
  "9": "September",
  "10": "October",
  "11": "November",
  "12": "December",
};

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function AtRiskPeriodFilters({
  month,
  year,
  disabled,
  onChange,
}: {
  month: number;
  year: number;
  disabled?: boolean;
  onChange: (month: number, year: number) => void;
}) {
  const now = new Date();
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Select
        value={String(month)}
        onValueChange={(value) => onChange(Number(value), year)}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-[6.75rem] text-xs">
          <SelectValue>{MONTH_LABELS[String(month)] ?? "Month"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(MONTH_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(year)}
        onValueChange={(value) => onChange(month, Number(value))}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-[4.75rem] text-xs">
          <SelectValue>{year}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {years.map((item) => (
            <SelectItem key={item} value={String(item)}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function formatAttendanceMeta(meta: string) {
  const match = meta.match(/([\d.]+)\s*%/);
  if (match?.[1]) return `${match[1]}%`;
  return meta.replace(/\s*attendance$/i, "").trim() || meta;
}

export function CeoAttendanceInsights({
  kpis,
  overview,
  exceptions,
  initialMonth,
  initialYear,
}: {
  kpis: CeoAttendanceKpis;
  overview: CeoAttendanceOverview;
  exceptions: CeoAttendanceExceptions;
  initialMonth?: number;
  initialYear?: number;
}) {
  const now = new Date();
  const [atRiskMonth, setAtRiskMonth] = useState(initialMonth ?? now.getMonth() + 1);
  const [atRiskYear, setAtRiskYear] = useState(initialYear ?? now.getFullYear());
  const [lowAttendance, setLowAttendance] = useState(exceptions.lowAttendance.slice(0, 6));
  const [isAtRiskPending, startAtRiskTransition] = useTransition();

  useEffect(() => {
    setAtRiskMonth(initialMonth ?? new Date().getMonth() + 1);
    setAtRiskYear(initialYear ?? new Date().getFullYear());
  }, [initialMonth, initialYear]);

  useEffect(() => {
    startAtRiskTransition(async () => {
      const data = await fetchCeoAttendanceExceptionsAction({
        month: atRiskMonth,
        year: atRiskYear,
      });
      setLowAttendance(data.lowAttendance.slice(0, 6));
    });
  }, [atRiskMonth, atRiskYear]);

  const periodLabel = `${MONTH_LABELS[String(atRiskMonth)] ?? "Month"} ${atRiskYear}`;

  return (
    <section className="w-full space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Workforce Insights</h2>
        <p className="text-xs text-muted-foreground">
          Live availability and monthly at-risk attendance
        </p>
      </div>

      <div className="grid w-full gap-3 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-stretch">
        <section className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <Users className="size-3.5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-tight">Today&apos;s Pulse</h3>
              <p className="text-xs text-muted-foreground">Live workforce availability</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-background/80 px-3 py-2.5">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Present
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {kpis.presentToday}
              </p>
            </div>
            <div className="rounded-lg border bg-background/80 px-3 py-2.5">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Absent
              </p>
              <p
                className={cn(
                  "mt-1 text-xl font-semibold tabular-nums",
                  kpis.absentToday > 0 ? "text-destructive" : undefined,
                )}
              >
                {kpis.absentToday}
              </p>
            </div>
            <div className="rounded-lg border bg-background/80 px-3 py-2.5">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                On Leave
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{kpis.onLeaveToday}</p>
            </div>
            <div className="rounded-lg border bg-background/80 px-3 py-2.5">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Late
              </p>
              <p
                className={cn(
                  "mt-1 text-xl font-semibold tabular-nums",
                  kpis.lateArrivals > 0
                    ? "text-amber-700 dark:text-amber-400"
                    : undefined,
                )}
              >
                {kpis.lateArrivals}
              </p>
            </div>
            <div className="rounded-lg border bg-background/80 px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                <Home className="size-3" />
                WFH
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{kpis.workFromHome}</p>
            </div>
            <div className="rounded-lg border bg-background/80 px-3 py-2.5">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Overtime
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {kpis.overtimeHours.toFixed(1)}h
              </p>
            </div>
          </div>

          <div className="mt-auto pt-3">
            <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Monthly {formatCeoPercent(overview.monthlyAttendancePercent)} · Avg{" "}
              {overview.averageWorkingHours.toFixed(1)} hrs
            </div>
          </div>
        </section>

        <section className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-rose-500/10 text-rose-700 dark:text-rose-400">
                <TrendingDown className="size-3.5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold tracking-tight">At Risk</h3>
                <p className="text-xs text-muted-foreground">
                  Lowest monthly attendance · {periodLabel}
                </p>
              </div>
            </div>
            <AtRiskPeriodFilters
              month={atRiskMonth}
              year={atRiskYear}
              disabled={isAtRiskPending}
              onChange={(month, year) => {
                setAtRiskMonth(month);
                setAtRiskYear(year);
              }}
            />
          </div>

          {isAtRiskPending && lowAttendance.length === 0 ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading monthly list…
            </div>
          ) : lowAttendance.length === 0 ? (
            <EmptyNote>No low-attendance employees for {periodLabel}.</EmptyNote>
          ) : (
            <div className={cn("flex-1", isAtRiskPending && "opacity-70")}>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Monthly attendance below target for {periodLabel}
              </p>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {lowAttendance.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-lg border bg-background/80 px-3 py-3"
                  >
                    <p className="min-w-0 flex-1 text-sm font-medium leading-snug break-words">
                      {item.label}
                    </p>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                        {formatAttendanceMeta(item.meta)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">monthly</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
