"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlarmClock, CalendarClock, LogIn, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { Button } from "@/components/common/button";
import { EmployeeSectionCard } from "@/components/employee/dashboard/employee-module-primitives";
import {
  employeeAttendancePunchAction,
  employeeUpdateCheckoutAction,
} from "@/lib/employee/actions/employee-dashboard-actions";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import {
  elapsedWorkingSeconds,
  formatWorkingDuration,
} from "@/lib/employee/attendance-format";
import { formatAttendanceTime } from "@/lib/attendance/services/attendance-utils";
import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

function TimeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function EmployeeAttendanceWidget({ today }: { today: ManagerTodayAttendance }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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

  const runAction = (action: "in" | "out" | "update") => {
    startTransition(async () => {
      const result =
        action === "update"
          ? await employeeUpdateCheckoutAction({
              attendanceId: today.attendanceId ?? undefined,
            })
          : await employeeAttendancePunchAction({ type: action });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(
        action === "in"
          ? "Checked in successfully"
          : action === "out"
            ? "Checked out successfully"
            : "Check-out time updated",
      );
      router.refresh();
    });
  };

  const checkInLabel = today.checkInAt ? formatAttendanceTime(today.checkInAt) : "—";
  const checkOutLabel = today.checkOutAt ? formatAttendanceTime(today.checkOutAt) : "—";

  return (
    <EmployeeSectionCard
      title="Today's Attendance"
      description="Mark your attendance and track your working hours."
      action={
        today.attendanceStatus ? (
          <AttendanceStatusBadge status={today.attendanceStatus} />
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-1 rounded-xl border bg-gradient-to-br from-primary/5 via-card to-card py-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Working Timer
          </p>
          <p className="text-3xl font-semibold tabular-nums">
            {formatWorkingDuration(elapsed)}
          </p>
          {today.lateMinutes > 0 ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              <AlarmClock className="size-3" />
              Late by {today.lateMinutes} min
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <TimeStat label="Check-In" value={checkInLabel} />
          <TimeStat label="Check-Out" value={checkOutLabel} />
        </div>

        {today.lockMessage ? (
          <p className="text-[11px] text-muted-foreground">{today.lockMessage}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {today.punchState === "not_checked_in" ? (
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              disabled={isPending || today.isLocked}
              onClick={() => runAction("in")}
            >
              <LogIn className="size-4" />
              Check In
            </Button>
          ) : null}

          {today.punchState === "checked_in" ? (
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              disabled={isPending}
              onClick={() => runAction("out")}
            >
              <LogOut className="size-4" />
              Check Out
            </Button>
          ) : null}

          {today.punchState === "checked_out" ? (
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 gap-1.5"
              disabled={isPending}
              onClick={() => runAction("update")}
            >
              <RefreshCw className="size-4" />
              Update Check-Out
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5"
            nativeButton={false}
            render={<Link href={EMPLOYEE_ROUTES.attendance} />}
          >
            <CalendarClock className="size-4" />
            {today.isLocked ? "Regularize" : "View Attendance"}
          </Button>
        </div>
      </div>
    </EmployeeSectionCard>
  );
}
