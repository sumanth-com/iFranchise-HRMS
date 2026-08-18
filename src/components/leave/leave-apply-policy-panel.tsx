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
}: {
  context?: LeaveApplyContext | null;
  employeeName: string;
}) {
  const [open, setOpen] = useState(false);
  const approvalLevels = context?.approvalLevels ?? 2;
  const document = context?.policyDocument ?? DEFAULT_LEAVE_POLICY_DOCUMENT;

  return (
    <div className="rounded-xl border bg-muted/20 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Leave Policy</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            <li>Check your available balance before applying.</li>
            <li>Leave requests may require prior intimation depending on leave type.</li>
            <li>Weekly holidays may be counted under the Sandwich Leave Policy.</li>
            <li>
              {approvalLevels >= 2
                ? "Your request is subject to Manager and HR approval."
                : "Your request is subject to approval."}
            </li>
          </ul>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          View Leave Policy
        </Button>
      </div>

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

  return (
    <div className="space-y-3 rounded-xl border bg-card px-4 py-3">
      <div>
        <p className="text-sm font-semibold">Leave period</p>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </div>
      <LeaveDurationBreakdownCard breakdown={preview.duration} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
        {preview.available != null ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-xs text-muted-foreground">Available</dt>
              <dd className="font-medium tabular-nums">{preview.available}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-xs text-muted-foreground">Remaining after</dt>
              <dd
                className={cn(
                  "font-medium tabular-nums",
                  preview.remaining != null && preview.remaining < 0 && "text-destructive",
                )}
              >
                {preview.remaining}
              </dd>
            </div>
          </>
        ) : null}
      </dl>
      {preview.messages.length > 0 ? (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {preview.messages.map((message) => (
            <li key={message}>• {message}</li>
          ))}
        </ul>
      ) : null}
      {preview.issues.map((issue) => (
        <p key={issue.code} className="text-xs text-destructive">
          {issue.message}
        </p>
      ))}
    </div>
  );
}
