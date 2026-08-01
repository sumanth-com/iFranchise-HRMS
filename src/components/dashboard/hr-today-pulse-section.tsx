import Link from "next/link";
import { format, parseISO } from "date-fns";
import { CalendarDays, ClipboardList, Users } from "lucide-react";

import type { DashboardListItem, HrTodayPulse } from "@/types/dashboard";
import { cn } from "@/lib/utils";

function PulseMetric({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href?: string;
  accent?: string;
}) {
  const content = (
    <div className="flex min-h-[4.5rem] flex-col justify-between rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30">
      <p className="line-clamp-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", accent)}>{value}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function HrTodayPulseSection({ pulse }: { pulse: HrTodayPulse }) {
  return (
    <section
      className="rounded-xl border bg-card p-4 shadow-sm md:p-5"
      aria-label="Today's Pulse"
    >
      <div className="mb-4 flex items-center gap-2">
        <Users className="size-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Today&apos;s Pulse</h2>
          <p className="text-xs text-muted-foreground">
            Executive workforce snapshot — no duplicate KPI cards elsewhere.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <PulseMetric
          label="Present Today"
          value={pulse.presentToday}
          href="/dashboard/attendance"
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <PulseMetric
          label="Absent Today"
          value={pulse.absentToday}
          href="/dashboard/attendance?tab=team&attendanceStatus=absent"
          accent="text-destructive"
        />
        <PulseMetric
          label="Late Employees"
          value={pulse.lateToday}
          href="/dashboard/attendance"
          accent="text-orange-600 dark:text-orange-400"
        />
        <PulseMetric
          label="Pending Approvals"
          value={pulse.pendingApprovals}
          href="/dashboard/leave?tab=team"
          accent="text-violet-600 dark:text-violet-400"
        />
        <PulseMetric
          label="Exit Requests"
          value={pulse.exitRequests}
          href="/dashboard/exit"
          accent="text-rose-600 dark:text-rose-400"
        />
      </div>

      {pulse.upcomingHolidays.length > 0 ? (
        <div className="mt-4 rounded-xl border bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <CalendarDays className="size-3.5" />
            Upcoming Holidays
          </div>
          <ul className="space-y-1.5">
            {pulse.upcomingHolidays.slice(0, 4).map((holiday) => (
              <li key={holiday.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={holiday.href} className="font-medium hover:underline">
                  {holiday.primary}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {holiday.meta
                    ? format(parseISO(holiday.meta.length >= 10 ? holiday.meta.slice(0, 10) : holiday.meta), "d MMM")
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <ClipboardList className="size-3.5" />
          No upcoming holidays in the next 30 days.
        </p>
      )}
    </section>
  );
}
