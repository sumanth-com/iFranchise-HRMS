import type { LeavePolicyIssue } from "@/lib/leave/services/leave-policy-engine";
import type { LeaveStatus } from "@/types/leave";

export type HrReviewReason = "balance_exhausted" | "over_limit";
export type HrReviewDecision = "lop" | "special";

export type HrReviewMetadata = {
  required: true;
  reason: HrReviewReason;
  availableBalanceAtSubmit: number | null;
  employmentTypeCode: string | null;
  employeeName: string | null;
  submittedAt: string;
  decision?: HrReviewDecision | null;
  remarks?: string | null;
  decidedAt?: string | null;
  decidedByEmployeeId?: string | null;
  decidedByRole?: "hr" | "ceo" | null;
};

export const HR_REVIEW_INTRO =
  "Your requested leave exceeds your available leave balance or requires additional review. You can submit this request to the HR team for consideration.";

export const HR_REVIEW_BALANCE_HINT =
  "This request requires HR review because your available leave balance has been exhausted.";

export const HR_REVIEW_DURATION_HINT =
  "This request requires HR review due to the requested leave duration.";

export const HR_REVIEW_SUBMITTED_MESSAGE =
  "Your leave request has been submitted to the HR team for review.";

export function hrReviewReasonFromIssues(issues: LeavePolicyIssue[]): HrReviewReason | null {
  if (issues.some((issue) => issue.code === "hr_review_over_limit")) return "over_limit";
  if (issues.some((issue) => issue.code === "balance_exhausted")) return "balance_exhausted";
  return null;
}

export function parseHrReviewMetadata(breakdown: unknown): HrReviewMetadata | null {
  if (!breakdown || typeof breakdown !== "object") return null;
  const row = breakdown as Record<string, unknown>;
  if (row.hrReviewRequired !== true) return null;
  const reason = row.hrReviewReason === "over_limit" ? "over_limit" : "balance_exhausted";
  const decision =
    row.hrDecision === "lop" || row.hrDecision === "special" ? row.hrDecision : null;
  return {
    required: true,
    reason,
    availableBalanceAtSubmit:
      typeof row.availableBalanceAtSubmit === "number" ? row.availableBalanceAtSubmit : null,
    employmentTypeCode:
      typeof row.employmentTypeCode === "string" ? row.employmentTypeCode : null,
    employeeName: typeof row.employeeName === "string" ? row.employeeName : null,
    submittedAt: typeof row.submittedAt === "string" ? row.submittedAt : "",
    decision,
    remarks: typeof row.hrRemarks === "string" ? row.hrRemarks : null,
    decidedAt: typeof row.hrDecidedAt === "string" ? row.hrDecidedAt : null,
    decidedByEmployeeId:
      typeof row.hrDecidedByEmployeeId === "string" ? row.hrDecidedByEmployeeId : null,
    decidedByRole: row.hrDecidedByRole === "ceo" ? "ceo" : row.hrDecidedByRole === "hr" ? "hr" : null,
  };
}

export function isPendingHrReview(
  leaveStatus: string,
  breakdown: unknown,
): boolean {
  const review = parseHrReviewMetadata(breakdown);
  return leaveStatus === "pending" && Boolean(review?.required) && !review?.decision;
}

export function leaveStatusDisplayLabel(
  leaveStatus: LeaveStatus | string,
  breakdown?: unknown,
  options?: { audience?: "employee" | "ceo" },
): string {
  const review = parseHrReviewMetadata(breakdown);
  if (leaveStatus === "pending" && review?.required && !review.decision) {
    return "Pending HR Review";
  }
  if (leaveStatus === "approved" && options?.audience === "ceo") {
    if (review?.decidedByRole === "hr") return "Approved by HR";
    if (review?.decidedByRole === "ceo") return "Approved by CEO";
  }
  if (leaveStatus === "approved" && review?.decision === "lop") {
    return "Approved – LOP";
  }
  if (leaveStatus === "approved" && review?.decision === "special") {
    return "Approved – Special Leave";
  }
  if (leaveStatus === "pending") return "Pending approval";
  if (leaveStatus === "approved") return "Approved";
  if (leaveStatus === "rejected") return "Rejected";
  if (leaveStatus === "cancelled") return "Cancelled";
  if (leaveStatus === "withdrawn") return "Withdrawn";
  return String(leaveStatus);
}

export function attachHrReviewToBreakdown(
  breakdown: Record<string, unknown>,
  meta: HrReviewMetadata,
): Record<string, unknown> {
  return {
    ...breakdown,
    hrReviewRequired: true,
    hrReviewReason: meta.reason,
    availableBalanceAtSubmit: meta.availableBalanceAtSubmit,
    employmentTypeCode: meta.employmentTypeCode,
    employeeName: meta.employeeName,
    submittedAt: meta.submittedAt,
    hrDecision: meta.decision ?? null,
    hrRemarks: meta.remarks ?? null,
    hrDecidedAt: meta.decidedAt ?? null,
    hrDecidedByEmployeeId: meta.decidedByEmployeeId ?? null,
    hrDecidedByRole: meta.decidedByRole ?? null,
  };
}
