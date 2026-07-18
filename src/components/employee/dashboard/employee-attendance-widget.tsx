"use client";

import { useEffect, useState } from "react";
import { AlarmClock } from "lucide-react";

import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { EmployeeSectionCard } from "@/components/employee/dashboard/employee-module-primitives";
import {
  elapsedWorkingSeconds,
  formatWorkingDuration,
} from "@/lib/employee/attendance-format";
import { formatAttendanceTime } from "@/lib/attendance/services/attendance-utils";
import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-3 py-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          highlight
            ? "mt-1 text-lg font-semibold tabular-nums"
            : "mt-1 text-sm font-semibold tabular-nums"
        }
      >
        {value}
      </p>
    </div>
  );
}

export function EmployeeAttendanceWidget({ today }: { today: ManagerTodayAttendance }) {
  const [elapsed, setElapsed] = useState(() =>
    elapsedWorkingSeconds(today.checkInAt, today.checkOutAt),
  );

  const isRunning = today.punchState === "checked_in";

  useEffect(() => {
    setElapsed(elapsedWorkingSeconds(today.checkInAt, today.checkOutAt));
    if (!isRunning) return;
    const timer = setInterval(() => {
      setElapsed(elapsedWorkingSeconds(today.checkInAt, null));
    }, 1000);
    return () => clearInterval(timer);
  }, [today.checkInAt, today.checkOutAt, isRunning]);

  const checkInLabel = today.checkInAt ? formatAttendanceTime(today.checkInAt) : "—";
  const checkOutLabel = today.checkOutAt ? formatAttendanceTime(today.checkOutAt) : "—";

  return (
    <EmployeeSectionCard
      title="Today's Attendance"
      description="Track your working hours for today."
      className="shrink-0"
      action={
        today.attendanceStatus ? (
          <AttendanceStatusBadge status={today.attendanceStatus} />
        ) : null
      }
    >
      <div className="grid grid-cols-3 divide-x rounded-xl border bg-gradient-to-br from-primary/5 via-card to-card">
        <Stat label="Working Timer" value={formatWorkingDuration(elapsed)} highlight />
        <Stat label="Check-In" value={checkInLabel} />
        <Stat label="Check-Out" value={checkOutLabel} />
      </div>

      {today.lateMinutes > 0 ? (
        <div className="mt-3 flex justify-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
            <AlarmClock className="size-3" />
            Late by {today.lateMinutes} min
          </span>
        </div>
      ) : null}
    </EmployeeSectionCard>
  );
}
