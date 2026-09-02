/** Keep this module free of leave-policy-engine imports to avoid cycles. */

/** Full-time confirmed employees may use CL, EL, and Optional Holiday (plus gender-gated PL). */
export type LeaveEligibilityBand = "full_time_confirmed" | "cl_only";

export const SELF_SERVICE_MAX_LEAVE_DAYS = 3;

export const HR_CONTACT_EMAIL = "hr@ifranchise.in";

export const LEAVE_BALANCE_EXHAUSTED_MESSAGE =
  "Your available leave balance for this period has been exhausted. Please contact the HR team for further assistance regarding additional leave.";

export const LEAVE_OVER_THREE_DAYS_MESSAGE =
  "For leave requests exceeding 3 days, please contact the HR team for further review and assistance.";

export const LEAVE_TYPE_NOT_ELIGIBLE_MESSAGE =
  "This leave type is not available for your employment type. Please contact the HR team for assistance.";

const INTERN_TYPE_CODES = new Set(["INTERN", "INTERNSHIP", "TRAINEE"]);

function upper(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

/**
 * Interns, probationers, and non-full-time staff may apply Casual Leave only.
 * Confirmed full-time employees may apply CL, EL, and Optional Holiday.
 */
export function resolveLeaveEligibilityBand(input: {
  employmentStatus: string;
  employmentTypeCode?: string | null;
  isFullTime?: boolean | null;
}): LeaveEligibilityBand {
  const status = String(input.employmentStatus ?? "").toLowerCase();
  if (status === "probation") return "cl_only";

  const typeCode = upper(input.employmentTypeCode);
  if (INTERN_TYPE_CODES.has(typeCode)) return "cl_only";

  if (input.isFullTime === false) return "cl_only";

  return "full_time_confirmed";
}

export function isLeaveTypeAllowedForBand(
  leaveTypeCode: string,
  band: LeaveEligibilityBand,
): boolean {
  const code = upper(leaveTypeCode);
  if (code === "LOP") return true;
  if (band === "cl_only") return code === "CL";
  return true;
}

export function leaveBalanceCardCodesForBand(
  band: LeaveEligibilityBand,
): Array<"CL" | "EL" | "OH"> {
  if (band === "cl_only") return ["CL"];
  return ["CL", "EL", "OH"];
}

export function isOptionalHolidayAllowedForBand(band: LeaveEligibilityBand): boolean {
  return band === "full_time_confirmed";
}
