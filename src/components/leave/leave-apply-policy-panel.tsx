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
  LeavePolicySections,
} from "@/components/leave/leave-policy-content";
import { DEFAULT_LEAVE_POLICY_DOCUMENT, DEFAULT_INTERN_PROBATION_LEAVE_POLICY } from "@/lib/leave/leave-policy-defaults";
import { getLeaveSubmissionApprovalMessage } from "@/lib/leave/leave-approval-copy";
import type { HrReviewReason } from "@/lib/leave/hr-review";
import {
  LEAVE_ISSUE_ALERT_STYLES,
  getLeaveIssueUiVariant,
  leaveIssueAlertTitle,
} from "@/lib/leave/leave-issue-ui";
import {
  previewLeaveApplication,
  type LeaveApplyPreview,
} from "@/lib/leave/services/leave-apply-preview";
import { formatLeaveDate } from "@/lib/leave/services/leave-utils";
import type { LeavePolicyIssue } from "@/lib/leave/services/leave-policy-engine";
import {
  formatLeaveDayCount,
  formatLeaveDayUnit,
} from "@/lib/leave/services/leave-usage";
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
  const hasFullTimeLeaveTypes =
    context?.leaveTypes.some((leaveType) => leaveType.code === "EL") ?? true;
  const document =
    context?.policyDocument ??
    (hasFullTimeLeaveTypes
      ? DEFAULT_LEAVE_POLICY_DOCUMENT
      : DEFAULT_INTERN_PROBATION_LEAVE_POLICY);
  const approvalLine = getLeaveSubmissionApprovalMessage(
    context?.applicantRoleCodes ?? [],
    approvalLevels,
  );

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
              <li>Check your available CL/EL balance in HRMS before applying.</li>
              <li>Planned leave requires email, manager approval, and HRMS submission before you leave.</li>
              <li>Half-day leave is allowed only for the second half (3:00 p.m. onwards).</li>
              <li>Weekly offs and non-working days may count under the sandwich rule.</li>
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatSummaryDays(value: number): string {
  const count = formatLeaveDayCount(value);
  const unit = Math.abs(Number(count)) === 1 ? "Day" : "Days";
  return `${count} ${unit}`;
}

function formatBalanceDays(value: number): string {
  const rounded = Math.max(0, Number(formatLeaveDayCount(value)));
  return `${String(rounded).padStart(2, "0")} ${rounded === 1 ? "Day" : "Days"}`;
}

function SummaryMetric({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={cn("text-sm text-muted-foreground", bold && "font-semibold text-foreground")}>
        {label}
      </dt>
      <dd
        className={cn(
          "shrink-0 text-right text-sm tabular-nums text-foreground",
          bold ? "font-bold" : "font-medium",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function LeaveApplicationSummary({
  preview,
  hrReviewReason: _hrReviewReason = null,
  isOptionalHoliday: _isOptionalHoliday = false,
}: {
  preview: LeaveApplyPreview;
  hrReviewReason?: HrReviewReason | null;
  isOptionalHoliday?: boolean;
}) {
  const { summary } = preview;
  const remainingDisplay =
    summary.remainingBalance != null ? formatBalanceDays(summary.remainingBalance) : "—";

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1 rounded-xl border bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm">
          <span className="font-semibold text-foreground">Leave Balance Used:</span>{" "}
          <span className="font-bold tabular-nums text-foreground">
            {formatBalanceDays(summary.paidLeaveDays)}
          </span>
        </p>
        <p className="text-sm">
          <span className="font-semibold text-foreground">Remaining Balance:</span>{" "}
          <span className="font-bold tabular-nums text-foreground">{remainingDisplay}</span>
        </p>
      </div>

      <div className="rounded-xl border bg-white px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Leave Summary
        </p>
        <dl className="mt-2.5 space-y-2">
          <SummaryMetric
            label="Requested Leave Days"
            value={formatSummaryDays(summary.requestedLeaveDays)}
          />
          <SummaryMetric
            label="Sandwich Days"
            value={formatSummaryDays(summary.sandwichLeaveDays)}
          />
          <SummaryMetric label="Loss of Pay (LOP)" value={formatSummaryDays(summary.lopDays)} />
          <div className="border-t border-border/80 pt-2">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-violet-200/80 bg-violet-50/50 px-2.5 py-2">
              <dt className="text-sm font-semibold text-foreground">Total Leave Days Counted</dt>
              <dd className="shrink-0 text-right text-sm font-bold tabular-nums text-foreground">
                {formatSummaryDays(summary.totalLeaveDaysCounted)}
              </dd>
            </div>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function LeaveIssueAlertList({
  issues,
  className,
}: {
  issues: LeavePolicyIssue[];
  className?: string;
}) {
  if (issues.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {issues.map((issue) => {
        const variant = getLeaveIssueUiVariant(issue);
        const styles = LEAVE_ISSUE_ALERT_STYLES[variant];
        const isOverlap = issue.code === "overlap";
        return (
          <div
            key={issue.code}
            className={cn("rounded-lg border px-3 py-2.5", styles.container)}
          >
            <p className={cn("text-sm font-medium", styles.title)}>
              {leaveIssueAlertTitle(issue)}
            </p>
            <p className={cn("mt-0.5 text-xs leading-relaxed", styles.body)}>
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

export function LeaveDurationBreakdownCard({
  breakdown,
}: {
  breakdown: LeaveDurationBreakdown;
}) {
  const rows = [
    { label: "Working days", value: breakdown.workingDays },
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
            <dd className="font-medium tabular-nums">
              {formatLeaveDayCount(row.value)}
            </dd>
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
      ? Number((preview.available - preview.split.paidDays).toFixed(2))
      : null;

  const blockingIssues = preview.blockingIssues;

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
              {formatLeaveDayUnit(charged)}
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
            {formatLeaveDayCount(selectedDays)} {formatLeaveDayUnit(selectedDays)}
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
            {formatLeaveDayCount(charged)} {formatLeaveDayUnit(charged)}
          </span>
        </div>
        {preview.leaveType.isPaid ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Paid leave</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatLeaveDayCount(preview.split.paidDays)} {formatLeaveDayUnit(preview.split.paidDays)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Loss of Pay</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatLeaveDayCount(preview.split.lopDays)} {formatLeaveDayUnit(preview.split.lopDays)}
              </span>
            </div>
          </>
        ) : null}
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

      <LeaveIssueAlertList issues={blockingIssues} />
    </div>
  );
}
