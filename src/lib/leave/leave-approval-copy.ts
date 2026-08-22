import {
  requiresCeoLeaveApproval,
} from "@/lib/approvals/executive-request-routing";

/** User-facing approval summary for the apply-leave form (matches server routing). */
export function getLeaveSubmissionApprovalMessage(
  applicantRoleCodes: string[],
  approvalLevels: number,
): string {
  if (requiresCeoLeaveApproval(applicantRoleCodes)) {
    return "Your leave request will be reviewed by a CEO.";
  }
  if (approvalLevels >= 2) {
    return "Your request is subject to Manager and HR approval.";
  }
  return "Your request is subject to approval.";
}

/** Modal subtitle for self-service apply leave. */
export function getLeaveApplyDialogDescription(
  applicantRoleCodes: string[],
  approvalLevels: number,
): string {
  if (requiresCeoLeaveApproval(applicantRoleCodes)) {
    return "Submit a leave request for CEO approval.";
  }
  if (approvalLevels >= 2) {
    return "Submit a leave request for manager and HR approval.";
  }
  return "Submit a leave request for approval.";
}
