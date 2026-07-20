"use client";

import { format, parseISO } from "date-fns";
import { LogIn, LogOut, RefreshCw } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { formatAttendanceTime } from "@/lib/attendance/services/attendance-utils";
import {
  punchManagerAttendanceAction,
  updateManagerCheckoutAction,
} from "@/lib/manager/actions/manager-self-attendance-actions";
import {
  formatWorkingDuration,
  getElapsedWorkingSeconds,
} from "@/lib/manager/services/manager-self-attendance-service";
import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

type Props = {
  today: ManagerTodayAttendance;
};

export function ManagerProfileTodayCard({ today }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    getElapsedWorkingSeconds(today.checkInAt, today.checkOutAt),
  );

  useEffect(() => {
    setElapsedSeconds(
      getElapsedWorkingSeconds(today.checkInAt, today.checkOutAt),
    );

    if (!today.checkInAt || today.checkOutAt) return;

    const id = window.setInterval(() => {
      setElapsedSeconds(
        getElapsedWorkingSeconds(today.checkInAt, today.checkOutAt),
      );
    }, 1000);

    return () => window.clearInterval(id);
  }, [today.checkInAt, today.checkOutAt]);

  const dateLabel = format(parseISO(today.attendanceDate), "do MMM yyyy");

  function runAction(action: "in" | "out" | "update") {
    startTransition(async () => {
      const result =
        action === "update"
          ? await updateManagerCheckoutAction({
              attendanceId: today.attendanceId ?? undefined,
            })
          : await punchManagerAttendanceAction({ type: action });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        action === "in"
          ? "Checked in successfully"
          : action === "out"
            ? "Checked out successfully"
            : "Checkout updated",
      );
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Mark attendance for today ({dateLabel})
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Today&apos;s working hours:{" "}
              <span className="font-medium text-foreground">
                {formatWorkingDuration(elapsedSeconds)}
              </span>
              {today.lockMessage ? `. ${today.lockMessage}` : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {today.attendanceStatus ? (
              <AttendanceStatusBadge status={today.attendanceStatus} />
            ) : (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Not checked in
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <LogIn className="size-3.5" />
              Check in: {formatAttendanceTime(today.checkInAt)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-700 dark:text-orange-300">
              <LogOut className="size-3.5" />
              Check out: {formatAttendanceTime(today.checkOutAt)}
            </span>
          </div>
        </div>

        <div className="shrink-0">
          {today.punchState === "not_checked_in" ? (
            <Button
              disabled={isPending || today.isLocked}
              onClick={() => runAction("in")}
              className="min-w-40"
            >
              Check In
            </Button>
          ) : null}

          {today.punchState === "checked_in" ? (
            <Button
              disabled={isPending}
              onClick={() => runAction("out")}
              className="min-w-40"
            >
              Check Out
            </Button>
          ) : null}

          {today.punchState === "checked_out" ? (
            <Button
              disabled={isPending}
              onClick={() => runAction("update")}
              className="min-w-40 gap-2"
            >
              <RefreshCw className="size-4" />
              Update Check Out
            </Button>
          ) : null}

          {today.punchState === "locked" ? (
            <Button disabled className="min-w-40">
              Attendance locked
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
