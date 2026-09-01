import {
  requiresCeoLeaveApproval,
} from "@/lib/approvals/executive-request-routing";

/** User-facing approval summary for the apply-leave form (matches server routing). */
export function getLeaveSubmissionApprovalMessage(
  applicantRoleCodes: string[],
  _approvalLevels: number,
): string {
  if (requiresCeoLeaveApproval(applicantRoleCodes)) {
    return "Your leave request will be reviewed by a CEO.";
  }
  return "Your leave request will be reviewed by HR or a CEO.";
}

/** Modal subtitle for self-service apply leave. */
export function getLeaveApplyDialogDescription(
  applicantRoleCodes: string[],
  _approvalLevels: number,
): string {
  if (requiresCeoLeaveApproval(applicantRoleCodes)) {
    return "Submit a leave request for CEO approval.";
  }
  return "Submit a leave request for HR or CEO approval.";
}
