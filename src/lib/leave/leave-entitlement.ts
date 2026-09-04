import { parseISO } from "date-fns";

import type { LeaveEligibilityBand } from "@/lib/leave/leave-eligibility";
import {
  CASUAL_LEAVE_CODE,
  DEFAULT_LEAVE_PROBATION_RULES,
  getProbationSnapshot,
  type LeaveProbationRules,
} from "@/lib/leave/services/leave-policy-engine";
import { roundLeaveDays } from "@/lib/leave/services/leave-usage";
import type { LeaveEmployeeBalanceSnapshot } from "@/types/leave";

/** Calendar month of service (1 = joining month, 2 = second month, …). */
export function resolveEmploymentServiceMonth(
  joiningDate: string | null | undefined,
  asOfDate: string,
): number | null {
  if (!joiningDate) return null;
  const join = parseISO(joiningDate.slice(0, 10));
  const asOf = parseISO(asOfDate.slice(0, 10));
  if (Number.isNaN(join.getTime()) || Number.isNaN(asOf.getTime())) return null;
  if (asOf < join) return null;
  const months =
    (asOf.getFullYear() - join.getFullYear()) * 12 +
    (asOf.getMonth() - join.getMonth()) +
    1;
  return Math.max(1, months);
}

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
 * - One CL per calendar month from month 2 onward (expires monthly — not cumulative)
 * - Probation window may cap total CL across months 2–3
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

  const rules = input.probation ?? DEFAULT_LEAVE_PROBATION_RULES;
  const monthUsed = roundLeaveDays(Math.max(0, input.monthUsedDays));
  const monthPending = roundLeaveDays(Math.max(0, input.monthPendingDays));
  let monthlyAvailable = roundLeaveDays(
    Math.max(0, entitlement.monthlyEntitlement - monthUsed - monthPending),
  );

  if (
    entitlement.onProbationWindow &&
    entitlement.probationMonth != null &&
    entitlement.probationMonth >= 2
  ) {
    const probationRemaining = roundLeaveDays(
      Math.max(0, rules.casualLeaveCap - input.probationUsedAndPendingCl),
    );
    monthlyAvailable = roundLeaveDays(Math.min(monthlyAvailable, probationRemaining));
  }

  return {
    allocatedDays: entitlement.monthlyEntitlement,
    balanceDays: monthlyAvailable,
    monthTotalDays: entitlement.monthlyEntitlement,
  };
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

  let available = roundLeaveDays(Math.max(0, input.ledgerBalance));
  const probation = getProbationSnapshot(
    {
      joiningDate: input.joiningDate ?? null,
      employmentStatus: input.employmentStatus,
    },
    input.asOfDate,
    input.probation ?? DEFAULT_LEAVE_PROBATION_RULES,
  );

  if (probation.onProbation && probation.month != null && probation.month >= 2) {
    const rules = input.probation ?? DEFAULT_LEAVE_PROBATION_RULES;
    const probationRemaining = roundLeaveDays(
      Math.max(
        0,
        rules.casualLeaveCap - (input.usedAndPendingByType[CASUAL_LEAVE_CODE] ?? 0),
      ),
    );
    available = roundLeaveDays(Math.min(available, probationRemaining));
  }

  return available;
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
