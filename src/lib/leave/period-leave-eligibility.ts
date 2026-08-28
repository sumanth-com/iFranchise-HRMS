import {
  DEFAULT_LEAVE_PROBATION_RULES,
  PERIOD_LEAVE_CODE,
} from "@/lib/leave/services/leave-policy-engine";

export function isPeriodLeaveCode(code: string | null | undefined): boolean {
  return String(code ?? "").toUpperCase() === PERIOD_LEAVE_CODE;
}

/**
 * Menstruation Leave (PL) is offered to female employees only, unless the
 * organization has switched its female-only rule off.
 *
 * This mirrors the `pl_gender` check in validateLeavePolicy so the UI hides
 * exactly what the server would reject. Gender is the `hrms.gender_type` enum
 * ('male' | 'female' | 'other' | 'prefer_not_to_say') and is nullable, so
 * anything that is not explicitly female is treated as not eligible.
 */
export function isPeriodLeaveEligible(
  gender: string | null | undefined,
  femaleOnly: boolean = DEFAULT_LEAVE_PROBATION_RULES.periodLeaveFemaleOnly,
): boolean {
  if (!femaleOnly) return true;
  return String(gender ?? "").toLowerCase() === "female";
}
