"use client";

import { format, parseISO } from "date-fns";
import { Loader2, LogIn, LogOut, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { useOptionalSelfAttendanceLive } from "@/components/attendance/self-attendance-live-context";
import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { formatAttendanceTime } from "@/lib/attendance/services/attendance-utils";
import {
  buildCheckInMessage,
  buildCheckOutFarewell,
  buildEarlyCheckOutConfirm,
  isBeforeOfficeEnd,
} from "@/lib/employee/attendance-punch-messages";
import { useLiveWorkingSeconds } from "@/hooks/use-live-working-seconds";
import {
  formatWorkingDuration,
} from "@/lib/employee/attendance-format";
import { cn } from "@/lib/utils";
import type {
  ManagerAttendancePunchState,
  ManagerTodayAttendance,
} from "@/types/manager-self-attendance";

type PunchResult =
  | { success: true; today?: ManagerTodayAttendance; message?: string }
  | { success: false; message?: string; error?: string };

type DialogState =
  | { kind: "check_in"; title: string; body: string }
  | { kind: "check_out"; title: string; body: string }
  | { kind: "early_checkout_confirm" };

/** Auto-dismiss welcome / farewell popups after a few seconds. */
const PUNCH_MESSAGE_DISMISS_MS = 3500;

const PUNCH_BUTTON_CLASS =
  "h-11 min-w-[11.5rem] gap-2.5 rounded-lg px-6 text-sm font-semibold transition-all active:scale-[0.98]";

type Props = {
  firstName: string;
  today: ManagerTodayAttendance;
  onCheckIn: () => Promise<PunchResult>;
  onCheckOut: () => Promise<PunchResult>;
  onUpdateCheckout: () => Promise<PunchResult>;
  /** When false, checked-out state is read-only (no Update Check Out). */
  allowUpdateCheckout?: boolean;
};

function workflowHint(
  punchState: ManagerAttendancePunchState,
  allowUpdateCheckout: boolean,
) {
  switch (punchState) {
    case "checked_in":
      return "You're checked in. Tap Check Out when you finish for the day.";
    case "checked_out":
      return allowUpdateCheckout
        ? "Checked out for today. Update Check Out if you left later than recorded."
        : "Checked out for today. Your attendance for today is complete.";
    default:
      return "Tap Check In when you start work. Check-out stays available all day.";
  }
}

function PunchActionButton({
  children,
  onClick,
  disabled,
  variant = "default",
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "outline";
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        PUNCH_BUTTON_CLASS,
        className,
      )}
    >
      {children}
    </Button>
  );
}

function MessageCard({
  title,
  body,
  tone = "emerald",
}: {
  title: string;
  body: string;
  tone?: "emerald" | "indigo" | "amber";
}) {
  const toneClasses = {
    emerald: "from-emerald-500/15 via-background to-teal-500/5 border-emerald-500/20",
    indigo: "from-indigo-500/15 via-background to-violet-500/5 border-indigo-500/20",
    amber: "from-amber-500/15 via-background to-orange-500/5 border-amber-500/20",
  }[tone];

  const iconClasses = {
    emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    indigo: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br p-5",
        toneClasses,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            iconClasses,
          )}
        >
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-lg font-semibold tracking-tight">{title}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}

export function AttendanceTodayPunchCard({
  firstName,
  today: todayProp,
  onCheckIn,
  onCheckOut,
  onUpdateCheckout,
  allowUpdateCheckout = false,
}: Props) {
  const live = useOptionalSelfAttendanceLive();
  const today = live?.today ?? todayProp;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const elapsedSeconds = useLiveWorkingSeconds(today.checkInAt, today.checkOutAt);
  const workingHoursLabel =
    live?.workingHoursLabel ?? formatWorkingDuration(elapsedSeconds);

  useEffect(() => {
    if (dialog?.kind !== "check_in" && dialog?.kind !== "check_out") return;
    const id = window.setTimeout(() => setDialog(null), PUNCH_MESSAGE_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [dialog]);

  const dateLabel = format(parseISO(today.attendanceDate), "do MMM yyyy");
  const punchState =
    today.punchState === "locked" ? "not_checked_in" : today.punchState;

  function refreshAfterSuccess(nextToday?: ManagerTodayAttendance) {
    if (nextToday) live?.applyToday(nextToday);
    if (live) {
      live.refreshInBackground();
      return;
    }
    router.refresh();
  }

  function handleCheckIn() {
    startTransition(async () => {
      const result = await onCheckIn();
      if (!result.success) {
        toast.error(result.message ?? result.error ?? "Unable to check in");
        return;
      }
      const message = buildCheckInMessage(firstName);
      setDialog({
        kind: "check_in",
        title: message.title,
        body: message.body,
      });
      refreshAfterSuccess(result.today);
    });
  }

  function handleCheckOutConfirmed() {
    startTransition(async () => {
      const result = await onCheckOut();
      if (!result.success) {
        toast.error(result.message ?? result.error ?? "Unable to check out");
        return;
      }
      setDialog(null);

      // Good-night farewell only after official end of day (7:00 PM).
      if (isBeforeOfficeEnd()) {
        toast.success("Checked out successfully");
        refreshAfterSuccess(result.today);
        return;
      }

      const farewell = buildCheckOutFarewell(firstName);
      if (!farewell) {
        toast.success("Checked out successfully");
        refreshAfterSuccess(result.today);
        return;
      }
      setDialog({
        kind: "check_out",
        title: farewell.title,
        body: farewell.body,
      });
      refreshAfterSuccess(result.today);
    });
  }

  function handleCheckOutClick() {
    if (isBeforeOfficeEnd()) {
      setDialog({ kind: "early_checkout_confirm" });
      return;
    }
    handleCheckOutConfirmed();
  }

  function handleUpdateCheckout() {
    startTransition(async () => {
      const result = await onUpdateCheckout();
      if (!result.success) {
        toast.error(result.message ?? result.error ?? "Unable to update checkout");
        return;
      }
      toast.success("Checkout time updated");
      refreshAfterSuccess(result.today);
    });
  }

  const earlyConfirm = buildEarlyCheckOutConfirm(firstName);

  return (
    <>
      <section className="dashboard-surface card-surface-static attendance-wave-surface rounded-2xl border-0 bg-card p-5 dark:border">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Mark attendance for today ({dateLabel})
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Today&apos;s working hours:{" "}
                <span className="font-medium text-foreground">
                  {workingHoursLabel}
                </span>
                . {workflowHint(punchState, allowUpdateCheckout)}
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

          <div className="flex shrink-0 justify-end">
            {punchState === "not_checked_in" ? (
              <PunchActionButton onClick={handleCheckIn} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogIn className="size-4" />
                )}
                Check In
              </PunchActionButton>
            ) : null}

            {punchState === "checked_in" ? (
              <PunchActionButton onClick={handleCheckOutClick} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
                Check Out
              </PunchActionButton>
            ) : null}

            {punchState === "checked_out" && allowUpdateCheckout ? (
              <PunchActionButton
                onClick={handleUpdateCheckout}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Update Check Out
              </PunchActionButton>
            ) : null}
          </div>
        </div>
      </section>

      <Modal
        open={dialog?.kind === "check_in"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title="Welcome"
        showCancel={false}
        footer={
          <Button className="rounded-lg px-6" onClick={() => setDialog(null)}>
            Let&apos;s go
          </Button>
        }
        contentClassName="sm:max-w-md"
      >
        {dialog?.kind === "check_in" ? (
          <MessageCard title={dialog.title} body={dialog.body} tone="emerald" />
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === "check_out"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title="See you tomorrow"
        showCancel={false}
        footer={
          <Button className="rounded-lg px-6" onClick={() => setDialog(null)}>
            Good night
          </Button>
        }
        contentClassName="sm:max-w-md"
      >
        {dialog?.kind === "check_out" ? (
          <MessageCard title={dialog.title} body={dialog.body} tone="indigo" />
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === "early_checkout_confirm"}
        onOpenChange={(open) => {
          if (!open && !isPending) setDialog(null);
        }}
        title="Confirm check-out"
        description={earlyConfirm.title}
        showCancel={false}
        footer={
          <>
            <Button
              variant="outline"
              className="rounded-lg px-5"
              disabled={isPending}
              onClick={() => setDialog(null)}
            >
              {earlyConfirm.cancelLabel}
            </Button>
            <Button
              className="rounded-lg px-5"
              disabled={isPending}
              onClick={handleCheckOutConfirmed}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                earlyConfirm.confirmLabel
              )}
            </Button>
          </>
        }
        contentClassName="sm:max-w-md"
      >
        <MessageCard title="Before you leave" body={earlyConfirm.body} tone="amber" />
      </Modal>
    </>
  );
}
