/** User-facing approval summary for the apply-leave form. */
export function getLeaveSubmissionApprovalMessage(
  _applicantRoleCodes: string[],
  _approvalLevels: number,
): string {
  return "Your leave request will be reviewed by the HR team.";
}

/** Modal subtitle for self-service apply leave. */
export function getLeaveApplyDialogDescription(
  _applicantRoleCodes: string[],
  _approvalLevels: number,
): string {
  return "Submit a leave request for HR approval.";
}
