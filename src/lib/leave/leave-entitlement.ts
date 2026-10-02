import type { LeaveEligibilityBand } from "@/lib/leave/leave-eligibility";
import { resolveEmploymentServiceMonth } from "@/lib/leave/leave-service-month";

export { resolveEmploymentServiceMonth } from "@/lib/leave/leave-service-month";
import {
  CASUAL_LEAVE_CODE,
  DEFAULT_LEAVE_PROBATION_RULES,
  getProbationSnapshot,
  type LeaveProbationRules,
} from "@/lib/leave/services/leave-policy-engine";
import { roundLeaveDays } from "@/lib/leave/services/leave-usage";
import type { LeaveEmployeeBalanceSnapshot } from "@/types/leave";

export type InternProbationClEntitlement = {
  /** CL credit for the current calendar month (0 in first month unless policy allows). */
  monthlyEntitlement: number;
  serviceMonth: number | null;
  onProbationWindow: boolean;
  probationMonth: 1 | 2 | 3 | null;
};

/**
 * Intern / probation Casual Leave rules from the configured leave policy:
 * - No CL in the first employment month (unless org settings allow it)
 * - One fresh CL per calendar month from month 2 onward (unused expires that month)
 */
export function resolveInternProbationClEntitlement(input: {
  joiningDate: string | null | undefined;
  employmentStatus: string;
  leaveEligibilityBand: LeaveEligibilityBand;
  asOfDate: string;
  probation?: LeaveProbationRules;
}): InternProbationClEntitlement | null {
  if (input.leaveEligibilityBand !== "cl_only") return null;

  const rules = input.probation ?? DEFAULT_LEAVE_PROBATION_RULES;
  const serviceMonth = resolveEmploymentServiceMonth(input.joiningDate, input.asOfDate);
  const probation = getProbationSnapshot(
    {
      joiningDate: input.joiningDate ?? null,
      employmentStatus: input.employmentStatus,
    },
    input.asOfDate,
    rules,
  );

  if (serviceMonth == null) {
    return {
      monthlyEntitlement: 0,
      serviceMonth: null,
      onProbationWindow: probation.onProbation,
      probationMonth: probation.month,
    };
  }

  const firstMonthBlocked =
    serviceMonth === 1 && !rules.firstMonthLeaveAllowed;
  const monthlyEntitlement =
    firstMonthBlocked || serviceMonth < 1 ? 0 : serviceMonth >= 2 ? 1 : 0;

  return {
    monthlyEntitlement,
    serviceMonth,
    onProbationWindow: probation.onProbation,
    probationMonth: probation.month,
  };
}

export function resolvePolicyAdjustedClBalance(input: {
  joiningDate: string | null | undefined;
  employmentStatus: string;
  leaveEligibilityBand: LeaveEligibilityBand;
  asOfDate: string;
  monthUsedDays: number;
  monthPendingDays: number;
  probationUsedAndPendingCl: number;
  probation?: LeaveProbationRules;
}): {
  allocatedDays: number;
  balanceDays: number;
  monthTotalDays: number;
} | null {
  const entitlement = resolveInternProbationClEntitlement(input);
  if (!entitlement) return null;

  const monthUsed = roundLeaveDays(Math.max(0, input.monthUsedDays));
  const monthPending = roundLeaveDays(Math.max(0, input.monthPendingDays));
  const monthlyAvailable = roundLeaveDays(
    Math.max(0, entitlement.monthlyEntitlement - monthUsed - monthPending),
  );

  return {
    allocatedDays: entitlement.monthlyEntitlement,
    balanceDays: monthlyAvailable,
    monthTotalDays: entitlement.monthlyEntitlement,
  };
}

/**
 * Intern/probation CL stored on leave_balances.
 * Year-to-date used/pending stay on the row. Available balance is only this month's
 * fresh credit minus this month's use, so unused CL does not accumulate.
 */
export function resolveInternClStoredBalance(input: {
  monthlyEntitlement: number;
  yearUsedDays: number;
  yearPendingDays: number;
  monthUsedDays: number;
  monthPendingDays: number;
}): { allocatedDays: number; balanceDays: number } {
  const screen = {
    monthlyEntitlement: Math.max(0, input.monthlyEntitlement),
    monthUsed: Math.max(0, input.monthUsedDays),
    monthPending: Math.max(0, input.monthPendingDays),
  };
  const balanceDays = roundLeaveDays(
    Math.max(0, screen.monthlyEntitlement - screen.monthUsed - screen.monthPending),
  );
  const allocatedDays = roundLeaveDays(
    balanceDays + Math.max(0, input.yearUsedDays) + Math.max(0, input.yearPendingDays),
  );
  return { allocatedDays, balanceDays };
}

export function applyLeavePolicyToBalanceSnapshot(
  snapshot: LeaveEmployeeBalanceSnapshot,
  input: {
    joiningDate: string | null | undefined;
    employmentStatus: string;
    leaveEligibilityBand: LeaveEligibilityBand;
    asOfDate: string;
    monthPendingDays?: number;
    probationUsedAndPendingCl?: number;
    probation?: LeaveProbationRules;
  },
): LeaveEmployeeBalanceSnapshot {
  if (snapshot.leaveTypeCode.toUpperCase() !== CASUAL_LEAVE_CODE) {
    return snapshot;
  }

  const adjusted = resolvePolicyAdjustedClBalance({
    joiningDate: input.joiningDate,
    employmentStatus: input.employmentStatus,
    leaveEligibilityBand: input.leaveEligibilityBand,
    asOfDate: input.asOfDate,
    monthUsedDays: snapshot.monthUsedDays ?? 0,
    monthPendingDays: input.monthPendingDays ?? snapshot.pendingDays ?? 0,
    probationUsedAndPendingCl: input.probationUsedAndPendingCl ?? 0,
    probation: input.probation,
  });

  if (!adjusted) return snapshot;

  return {
    ...snapshot,
    allocatedDays: adjusted.allocatedDays,
    balanceDays: adjusted.balanceDays,
    monthTotalDays: adjusted.monthTotalDays,
  };
}

/** Single source of truth for apply-flow available balance after ledger reconcile. */
export function resolvePolicyAvailableLeaveBalance(input: {
  leaveTypeCode: string;
  ledgerBalance: number | null;
  joiningDate: string | null | undefined;
  employmentStatus: string;
  leaveEligibilityBand: LeaveEligibilityBand;
  asOfDate: string;
  monthUsedDays: number;
  monthPendingDays: number;
  probationUsedAndPendingCl: number;
  usedAndPendingByType: Record<string, number>;
  probation?: LeaveProbationRules;
}): number | null {
  const code = input.leaveTypeCode.toUpperCase();
  if (code !== CASUAL_LEAVE_CODE) {
    return input.ledgerBalance == null
      ? null
      : roundLeaveDays(Math.max(0, input.ledgerBalance));
  }

  const adjusted = resolvePolicyAdjustedClBalance({
    joiningDate: input.joiningDate,
    employmentStatus: input.employmentStatus,
    leaveEligibilityBand: input.leaveEligibilityBand,
    asOfDate: input.asOfDate,
    monthUsedDays: input.monthUsedDays,
    monthPendingDays: input.monthPendingDays,
    probationUsedAndPendingCl: input.probationUsedAndPendingCl,
    probation: input.probation,
  });

  if (adjusted) {
    return adjusted.balanceDays;
  }

  if (input.ledgerBalance == null) return null;
  return roundLeaveDays(Math.max(0, input.ledgerBalance));
}

export function shouldBlockInternProbationFirstMonthLeave(input: {
  leaveEligibilityBand: LeaveEligibilityBand;
  joiningDate: string | null | undefined;
  asOfDate: string;
  firstMonthLeaveAllowed: boolean;
}): boolean {
  if (input.leaveEligibilityBand !== "cl_only") return false;
  const serviceMonth = resolveEmploymentServiceMonth(input.joiningDate, input.asOfDate);
  if (serviceMonth == null) return false;
  return serviceMonth === 1 && !input.firstMonthLeaveAllowed;
}
