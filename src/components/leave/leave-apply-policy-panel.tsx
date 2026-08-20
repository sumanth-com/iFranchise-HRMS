"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LeavePolicyContactBar,
  LeavePolicySections,
} from "@/components/leave/leave-policy-content";
import { DEFAULT_LEAVE_POLICY_DOCUMENT } from "@/lib/leave/leave-policy-defaults";
import { previewLeaveApplication } from "@/lib/leave/services/leave-apply-preview";
import { formatLeaveDate } from "@/lib/leave/services/leave-utils";
import type { LeaveDurationBreakdown } from "@/lib/leave/services/leave-calendar-engine";
import type { LeaveApplyContext } from "@/types/leave";
import { cn } from "@/lib/utils";

export function LeavePolicyInfo({
  context,
  employeeName,
  compact = false,
}: {
  context?: LeaveApplyContext | null;
  employeeName: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const approvalLevels = context?.approvalLevels ?? 2;
  const document = context?.policyDocument ?? DEFAULT_LEAVE_POLICY_DOCUMENT;
  const approvalLine =
    approvalLevels >= 2
      ? "Your request is subject to Manager and HR approval."
      : "Your request is subject to approval.";

  return (
    <div className={cn("rounded-xl border bg-muted/20", compact ? "px-3 py-2" : "px-4 py-3")}>
      {compact ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{approvalLine}</p>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
            Policy
          </Button>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Leave Policy</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Check your available balance before applying.</li>
              <li>Leave requests may require prior intimation depending on leave type.</li>
              <li>Weekly holidays may be counted under the Sandwich Leave Policy.</li>
              <li>{approvalLine}</li>
            </ul>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            View Leave Policy
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(90vh,840px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>Leave Policy</DialogTitle>
            <DialogDescription>
              Company leave rules. Your current request is not affected if you close this.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <LeavePolicySections
              intro={document.intro}
              sections={document.sections}
              employeeName={employeeName}
            />
            <LeavePolicyContactBar contact={document.contact} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function LeaveDurationBreakdownCard({
  breakdown,
}: {
  breakdown: LeaveDurationBreakdown;
}) {
  const rows = [
    { label: "Working days", value: breakdown.workingDays },
    { label: "Half day", value: breakdown.halfDays },
    { label: "Weekly holidays", value: breakdown.weeklyHolidays },
    { label: "Public holidays", value: breakdown.publicHolidays },
    { label: "Sandwich days", value: breakdown.sandwichDays },
    { label: "Total leave", value: breakdown.totalLeaveDays },
  ];

  return (
    <div className="space-y-2">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-2">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="font-medium tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      {breakdown.sandwichExplanations.map((message) => (
        <p key={message} className="text-xs text-sky-800 dark:text-sky-300">
          {message}
        </p>
      ))}
    </div>
  );
}

export function LeaveDurationPreview({
  context,
  leaveTypeId,
  startDate,
  endDate,
  isHalfDay,
}: {
  context: LeaveApplyContext;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
}) {
  const preview = useMemo(
    () =>
      previewLeaveApplication({
        context,
        leaveTypeId,
        startDate,
        endDate,
        isHalfDay,
      }),
    [context, endDate, isHalfDay, leaveTypeId, startDate],
  );

  if (!preview) return null;

  const periodLabel =
    startDate === endDate
      ? formatLeaveDate(startDate)
      : `${formatLeaveDate(startDate)} – ${formatLeaveDate(endDate)}`;
  const charged = preview.duration.totalLeaveDays;
  const extraRows = [
    preview.duration.sandwichDays > 0
      ? { label: "Sandwich days", value: preview.duration.sandwichDays }
      : null,
    preview.duration.weeklyHolidays > 0
      ? { label: "Weekly holidays", value: preview.duration.weeklyHolidays }
      : null,
    preview.duration.publicHolidays > 0
      ? { label: "Public holidays", value: preview.duration.publicHolidays }
      : null,
    preview.duration.halfDays > 0
      ? { label: "Half day", value: preview.duration.halfDays }
      : null,
  ].filter((row): row is { label: string; value: number } => Boolean(row));

  const noticeIssue = preview.issues.find((issue) =>
    ["notice", "pl_same_day", "pl_past"].includes(issue.code),
  );
  const blockingIssues = preview.issues.filter(
    (issue) => !["notice", "pl_same_day", "pl_past"].includes(issue.code),
  );

  return (
    <div className="space-y-1.5 rounded-xl border bg-muted/20 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Leave period</p>
          <p className="text-xs text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-right">
          {preview.available != null ? (
            <div>
              <p className="text-[10px] text-muted-foreground">Available</p>
              <p className="text-sm font-semibold tabular-nums">{preview.available}</p>
            </div>
          ) : null}
          {preview.remaining != null ? (
            <div>
              <p className="text-[10px] text-muted-foreground">Remaining</p>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  preview.remaining < 0 && "text-destructive",
                )}
              >
                {preview.remaining}
              </p>
            </div>
          ) : null}
          <div>
            <p className="text-[10px] text-muted-foreground">Charged</p>
            <p className="text-sm font-semibold tabular-nums">{charged}</p>
          </div>
        </div>
      </div>

      {extraRows.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {extraRows.map((row) => (
            <span
              key={row.label}
              className="rounded-md bg-background px-2 py-1 text-[11px] text-muted-foreground"
            >
              {row.label}: <span className="font-medium text-foreground">{row.value}</span>
            </span>
          ))}
        </div>
      ) : null}

      {preview.duration.sandwichExplanations.map((message) => (
        <p key={message} className="text-xs leading-snug text-pretty text-sky-800 dark:text-sky-300">
          {message}
        </p>
      ))}

      {noticeIssue ? (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5">
          <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
            Advance notice required
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/80">
            {noticeIssue.message}
          </p>
        </div>
      ) : null}

      {blockingIssues.map((issue) => (
        <div
          key={issue.code}
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5"
        >
          <p className="text-sm font-medium text-destructive">Cannot submit this request</p>
          <p className="mt-0.5 text-xs leading-relaxed text-destructive/90">{issue.message}</p>
        </div>
      ))}
    </div>
  );
}
