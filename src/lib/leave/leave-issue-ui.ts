import type { LeavePolicyIssue } from "@/lib/leave/services/leave-policy-engine";

export type LeaveIssueUiVariant = "info" | "warning" | "error";

const INFO_ISSUE_CODES = new Set<string>([
  "duration",
  "balance",
  "balance_exhausted",
  "hr_review_over_limit",
]);

const WARNING_ISSUE_CODES = new Set<string>([
  "overlap",
  "notice",
  "pl_same_day",
  "pl_past",
  "half_day_morning",
]);

export function getLeaveIssueUiVariant(issue: LeavePolicyIssue): LeaveIssueUiVariant {
  if (INFO_ISSUE_CODES.has(issue.code)) return "info";
  if (WARNING_ISSUE_CODES.has(issue.code)) return "warning";
  return "error";
}

export function leaveIssueAlertTitle(issue: LeavePolicyIssue): string {
  switch (issue.code) {
    case "overlap":
      return "These dates already have leave";
    case "notice":
    case "pl_same_day":
    case "pl_past":
      return "Advance notice required";
    case "duration":
      return "No countable leave days";
    case "balance":
    case "balance_exhausted":
      return "Paid balance notice";
    case "hr_review_over_limit":
      return "HR review required";
    case "half_day_morning":
      return "Half-day rule";
    default:
      return "Please check these dates";
  }
}

export const LEAVE_ISSUE_ALERT_STYLES: Record<
  LeaveIssueUiVariant,
  { container: string; title: string; body: string }
> = {
  info: {
    container: "border-sky-500/35 bg-sky-500/10",
    title: "text-sky-950 dark:text-sky-100",
    body: "text-sky-900/90 dark:text-sky-100/80",
  },
  warning: {
    container: "border-amber-500/35 bg-amber-500/10",
    title: "text-amber-950 dark:text-amber-100",
    body: "text-amber-900/90 dark:text-amber-100/80",
  },
  error: {
    container: "border-destructive/30 bg-destructive/10",
    title: "text-destructive",
    body: "text-destructive/90",
  },
};
