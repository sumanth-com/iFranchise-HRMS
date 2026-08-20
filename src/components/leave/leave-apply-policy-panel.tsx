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
import { formatLeaveDayCount } from "@/lib/leave/services/leave-usage";
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
  const selectedDays =
    preview.duration.workingDays + preview.duration.halfDays * 0.5;
  const sandwichDays = preview.duration.sandwichDays;
  const hasSandwich = sandwichDays > 0;
  const balanceAfter =
    preview.available != null
      ? Number((preview.available - charged).toFixed(2))
      : null;

  const noticeIssue = preview.issues.find((issue) =>
    ["notice", "pl_same_day", "pl_past"].includes(issue.code),
  );
  const blockingIssues = preview.issues.filter(
    (issue) => !["notice", "pl_same_day", "pl_past"].includes(issue.code),
  );

  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Leave deduction</p>
          <p className="text-xs text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] text-muted-foreground">Total charged</p>
          <p className="text-lg font-semibold tabular-nums leading-tight">
            {formatLeaveDayCount(charged)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {charged === 1 ? "day" : "days"}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-1 rounded-lg border bg-background/70 px-2.5 py-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">
            {isHalfDay ? "Selected half day" : "Selected leave days"}
          </span>
          <span className="font-medium tabular-nums text-foreground">
            {formatLeaveDayCount(selectedDays)}
          </span>
        </div>
        {hasSandwich ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              Sandwich days (policy)
            </span>
            <span className="font-medium tabular-nums text-foreground">
              +{formatLeaveDayCount(sandwichDays)}
            </span>
          </div>
        ) : null}
        {preview.duration.publicHolidays > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Public holidays in range</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatLeaveDayCount(preview.duration.publicHolidays)} (not charged)
            </span>
          </div>
        ) : null}
        {preview.duration.weeklyHolidays > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Weekly holidays in range</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatLeaveDayCount(preview.duration.weeklyHolidays)} (not charged)
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t pt-1.5">
          <span className="font-medium text-foreground">Total leave charged</span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatLeaveDayCount(charged)}
          </span>
        </div>
      </div>

      {preview.available != null && balanceAfter != null ? (
        <p className="text-xs text-muted-foreground">
          Balance:{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatLeaveDayCount(preview.available)}
          </span>
          {" → "}
          <span
            className={cn(
              "font-medium tabular-nums",
              balanceAfter < 0 ? "text-destructive" : "text-foreground",
            )}
          >
            {formatLeaveDayCount(balanceAfter)}
          </span>{" "}
          after this request
        </p>
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

      {blockingIssues.map((issue) => {
        const isOverlap = issue.code === "overlap";
        return (
          <div
            key={issue.code}
            className={cn(
              "rounded-lg border px-3 py-2.5",
              isOverlap
                ? "border-amber-500/35 bg-amber-500/10"
                : "border-destructive/30 bg-destructive/10",
            )}
          >
            <p
              className={cn(
                "text-sm font-medium",
                isOverlap
                  ? "text-amber-950 dark:text-amber-100"
                  : "text-destructive",
              )}
            >
              {isOverlap ? "These dates already have leave" : "Cannot submit this request"}
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs leading-relaxed",
                isOverlap
                  ? "text-amber-900/90 dark:text-amber-100/80"
                  : "text-destructive/90",
              )}
            >
              {isOverlap
                ? "You already have a pending or approved leave on one or more of these dates. Choose different dates, or cancel the existing request first."
                : issue.message}
            </p>
          </div>
        );
      })}
    </div>
  );
}
