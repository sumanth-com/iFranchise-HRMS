import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { LeaveFormInput } from "@/lib/validations/leave";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import { getCurrentBalanceYear } from "@/lib/leave/services/leave-utils";
import { reconcileEmployeePaidLeaveLedger } from "@/lib/leave/services/leave-ledger-reconcile";
import {
  isMonthlyAccrualLeaveCode,
  resolveMonthlyAccrualOpeningAllocation,
  ensureEmployeeMonthlyLeaveAccruals,
} from "@/lib/leave/services/leave-monthly-accrual";
import {
  evaluateLeaveApplication,
  hasOverlappingLeave,
  loadLeavePolicyRuntime,
} from "@/lib/leave/services/leave-policy-runtime";
import {
  getEmployeeReportingManagerId,
  getEmployeeRoleCodes,
  getHrApproverEmployeeId,
  isCeoLeaveApprover,
  isHrLeaveActor,
  canActorDecideLeaveRequest,
  LEAVE_ALREADY_APPROVED_BY_OTHER_CEO_MESSAGE,
  LEAVE_ALREADY_PROCESSED_MESSAGE,
  NO_HR_APPROVER_CONFIGURED_MESSAGE,
  requireActiveCeoApproverEmployeeIds,
} from "@/lib/leave/services/leave-queries";
import { requiresCeoLeaveApproval } from "@/lib/approvals/executive-request-routing";
import {
  allocateLeaveDaysByBalance,
  PERIOD_LEAVE_CODE,
  splitLeaveDaysByBalance,
} from "@/lib/leave/services/leave-policy-engine";
import {
  attachHrReviewToBreakdown,
  hrReviewReasonFromIssues,
  isPendingHrReview,
  parseHrReviewMetadata,
} from "@/lib/leave/hr-review";
import { roundLeaveDays } from "@/lib/leave/services/leave-usage";
import type { LeaveDurationBreakdown } from "@/lib/leave/services/leave-calendar-engine";
import {
  clearAttendanceForLeaveRequest,
  syncAttendanceForApprovedLeave,
} from "@/lib/leave/services/leave-attendance-sync";
import { isPeriodLeaveEligible } from "@/lib/leave/period-leave-eligibility";
import {
  notifyLeaveApproved,
  notifyLeaveCancelled,
  notifyLeaveHrReviewDecided,
  notifyLeaveHrReviewSubmitted,
  notifyLeaveRejected,
  notifyLeaveSubmitted,
} from "@/lib/leave/services/leave-notifications";
import { emitHrmsWebhook } from "@/lib/public-api/emit";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

async function refreshDraftPayrollAfterLeaveChange(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
) {
  try {
    const { refreshDraftPayrollItemsForEmployee } = await import(
      "@/lib/payroll/services/payroll-mutations"
    );
    await refreshDraftPayrollItemsForEmployee(supabase, profile, employeeId);
  } catch (error) {
    console.error("[leave] payroll refresh failed", error);
  }
}

/**
 * Emails the current pending approver(s) a secure approve/reject link.
 * Uses a dynamic import to avoid a static import cycle with the approval
 * engine, and never throws so leave mutations are unaffected by email issues.
 */
async function dispatchLeaveApprovalEmails(
  leaveRequestId: string,
  createdByUserId?: string | null,
) {
  try {
    const { dispatchApprovalEmails } = await import(
      "@/lib/approvals/email-approval-service"
    );
    await dispatchApprovalEmails({
      requestType: "leave",
      sourceRecordId: leaveRequestId,
      createdByUserId: createdByUserId ?? null,
    });
  } catch (error) {
    console.error("[leave] approval email dispatch failed", error);
  }
}

function scheduleLeaveApprovalEmails(
  leaveRequestId: string,
  createdByUserId?: string | null,
) {
  void dispatchLeaveApprovalEmails(leaveRequestId, createdByUserId);
}

async function getLeaveBalanceRow(
  supabase: AuthSupabaseClient,
  employeeId: string,
  leaveTypeId: string,
  balanceYear: number,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_balances")
    .select("id, allocated_days, used_days, pending_days, balance_days")
    .eq("employee_id", employeeId)
    .eq("leave_type_id", leaveTypeId)
    .eq("balance_year", balanceYear)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function adjustLeaveBalance(
  supabase: AuthSupabaseClient,
  employeeId: string,
  leaveTypeId: string,
  balanceYear: number,
  delta: { pending?: number; used?: number },
) {
  // A fully-LOP request reserves nothing, so there is no ledger row to touch and
  // no reason to fail an employee who has never had a balance allocated.
  if (!delta.pending && !delta.used) return { appliedPending: 0, appliedUsed: 0 };

  const balance = await getLeaveBalanceRow(
    supabase,
    employeeId,
    leaveTypeId,
    balanceYear,
  );

  if (!balance) {
    throw new Error("Leave balance not configured for this employee and leave type");
  }

  const pendingDays = Math.max(0, Number(balance.pending_days) + (delta.pending ?? 0));
  const usedDays = Math.max(0, Number(balance.used_days) + (delta.used ?? 0));
  const allocatedDays = Number(balance.allocated_days);
  const uncapped = allocatedDays - usedDays - pendingDays;
  let nextPending = pendingDays;
  let nextUsed = usedDays;
  if (uncapped < 0 && (delta.pending ?? 0) > 0) {
    nextPending = Math.max(0, allocatedDays - usedDays);
  } else if (uncapped < 0 && (delta.used ?? 0) > 0) {
    nextUsed = Math.max(0, allocatedDays - pendingDays);
  }
  const balanceDays = roundLeaveDays(Math.max(0, allocatedDays - nextUsed - nextPending));

  const { error, data } = await supabase
    .schema("hrms")
    .from("leave_balances")
    .update({
      pending_days: nextPending,
      used_days: nextUsed,
      balance_days: balanceDays,
      updated_at: new Date().toISOString(),
    })
    .eq("id", balance.id)
    .eq("pending_days", balance.pending_days)
    .eq("used_days", balance.used_days)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("Leave balance was updated by another request. Please try again.");
  }

  return {
    appliedPending: roundLeaveDays(nextPending - Number(balance.pending_days)),
    appliedUsed: roundLeaveDays(nextUsed - Number(balance.used_days)),
  };
}

/**
 * Days a request actually reserved against the paid balance. Requests created
 * before the paid/LOP split existed reserved their full duration, so fall back to
 * total_days to keep their release amounts symmetrical.
 */
function durationBreakdownWithSplit(
  duration: Parameters<typeof allocateLeaveDaysByBalance>[0],
  paidDays: number,
  lopDays: number,
  calendar?: import("@/lib/leave/services/leave-calendar-engine").LeaveCalendarContext,
) {
  return {
    ...duration,
    paidDays,
    lopDays,
    dayAllocations: allocateLeaveDaysByBalance(duration, paidDays, { calendar }),
  };
}

function reservedPaidDays(request: {
  total_days: number | string;
  duration_breakdown?: unknown;
}) {
  const breakdown = request.duration_breakdown as { paidDays?: unknown } | null;
  const stored = breakdown?.paidDays;
  return typeof stored === "number" ? stored : Number(request.total_days);
}

/**
 * Approval re-derives the duration (the holiday calendar may have moved since the
 * request was filed) but must settle against the days that were actually reserved,
 * otherwise the pending release and the used debit drift apart. The paid portion is
 * therefore capped at the reservation and the remainder becomes LOP.
 */
function resolveApprovedSplit(
  request: { total_days: number | string; duration_breakdown?: unknown },
  approvedTotalDays: number,
) {
  const reservedDays = reservedPaidDays(request);
  const paidDays = roundLeaveDays(Math.min(reservedDays, approvedTotalDays));
  return {
    reservedDays,
    paidDays,
    lopDays: roundLeaveDays(approvedTotalDays - paidDays),
  };
}

async function ensureLeaveBalanceRow(
  supabase: AuthSupabaseClient,
  employeeId: string,
  leaveTypeId: string,
  balanceYear: number,
  allocatedDays: number,
  userId: string,
  options?: { accruedThroughMonth?: string | null },
) {
  const existing = await getLeaveBalanceRow(
    supabase,
    employeeId,
    leaveTypeId,
    balanceYear,
  );
  if (existing) return existing;

  const allocated = Math.max(allocatedDays, 0);
  const { error } = await supabase
    .schema("hrms")
    .from("leave_balances")
    .insert({
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      balance_year: balanceYear,
      allocated_days: allocated,
      used_days: 0,
      pending_days: 0,
      balance_days: allocated,
      accrued_through_month: options?.accruedThroughMonth ?? null,
      status: "active",
      created_by: userId,
      updated_by: userId,
    });

  if (error) {
    const raced = await getLeaveBalanceRow(
      supabase,
      employeeId,
      leaveTypeId,
      balanceYear,
    );
    if (raced) return raced;
    throw new Error(error.message);
  }

  return getLeaveBalanceRow(supabase, employeeId, leaveTypeId, balanceYear);
}

type LeaveBalanceInitContext = {
  organizationId: string;
  userId: string;
};

function resolveLeaveBalanceInitContext(
  profileOrContext: UserProfile | LeaveBalanceInitContext,
): LeaveBalanceInitContext {
  if ("organizationId" in profileOrContext) {
    return profileOrContext;
  }
  return {
    organizationId: profileOrContext.employee.organizationId,
    userId: profileOrContext.userId,
  };
}

/** Leave types tracked on the balance ledger — LOP is unpaid and not allocated. */
const LEAVE_BALANCE_INIT_SKIP_CODES = new Set(["LOP"]);

/**
 * Creates annual leave ledger rows from the organization's configured leave types.
 * Safe to call repeatedly — existing rows are left unchanged.
 */
export async function initializeEmployeeLeaveBalances(
  supabase: AuthSupabaseClient,
  profileOrContext: UserProfile | LeaveBalanceInitContext,
  employeeId: string,
  balanceYear = getCurrentBalanceYear(),
): Promise<void> {
  const { organizationId, userId } = resolveLeaveBalanceInitContext(profileOrContext);

  const [{ data: leaveTypes, error }, { data: employeeProfile, error: profileError }, runtime] =
    await Promise.all([
      supabase
        .schema("hrms")
        .from("leave_types")
        .select("id, code, days_per_year")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .is("deleted_at", null),
      supabase
        .schema("hrms")
        .from("employee_profiles")
        .select("gender")
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .maybeSingle(),
      loadLeavePolicyRuntime(supabase, organizationId),
    ]);

  if (error) throw new Error(error.message);
  if (profileError) throw new Error(profileError.message);

  const periodLeaveEligible = isPeriodLeaveEligible(
    employeeProfile?.gender as string | null | undefined,
    runtime.probation.periodLeaveFemaleOnly,
  );

  for (const leaveType of leaveTypes ?? []) {
    const code = String(leaveType.code ?? "").toUpperCase();
    if (LEAVE_BALANCE_INIT_SKIP_CODES.has(code)) continue;
    if (code === PERIOD_LEAVE_CODE && !periodLeaveEligible) continue;

    let allocatedDays = Math.max(Number(leaveType.days_per_year ?? 0), 0);
    let accruedThroughMonth: string | null = null;

    if (isMonthlyAccrualLeaveCode(code)) {
      const opening = await resolveMonthlyAccrualOpeningAllocation(
        supabase,
        employeeId,
        leaveType.id as string,
        balanceYear,
      );
      allocatedDays = opening.allocatedDays;
      accruedThroughMonth = opening.accruedThroughMonth;
    }

    await ensureLeaveBalanceRow(
      supabase,
      employeeId,
      leaveType.id as string,
      balanceYear,
      allocatedDays,
      userId,
      { accruedThroughMonth },
    );
  }

  await ensureEmployeeMonthlyLeaveAccruals(supabase, employeeId, {
    balanceYear,
    actorUserId: userId,
  });
  await reconcileEmployeePaidLeaveLedger(supabase, employeeId, {
    balanceYear,
    actorUserId: userId,
  });
}

async function assertEmployeeInOrganization(
  supabase: AuthSupabaseClient,
  employeeId: string,
  organizationId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, organization_id")
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.organization_id !== organizationId) {
    throw new Error("This employee is not in your organization");
  }
}

async function createApprovalSteps(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
  _approvalLevels: number,
) {
  const organizationId = profile.employee.organizationId;
  const applicantRoles = await getEmployeeRoleCodes(supabase, employeeId);
  const submitterRoles = profile.roles.map((role) => role.code);
  const executiveApplicant =
    requiresCeoLeaveApproval(applicantRoles) ||
    (employeeId === profile.employee.id &&
      requiresCeoLeaveApproval(submitterRoles));

  const steps: Array<{ approverId: string; level: number }> = [];

  if (executiveApplicant) {
    const ceoIds = await requireActiveCeoApproverEmployeeIds(
      supabase,
      organizationId,
    );
    for (const ceoId of ceoIds) {
      steps.push({ approverId: ceoId, level: 1 });
    }
  } else {
    const hrId = await getHrApproverEmployeeId(supabase, organizationId, {
      employeeId,
      excludeEmployeeIds: [employeeId],
    });
    if (!hrId) {
      console.error("[leave] HR approver routing failed (fail-closed)", {
        organizationId,
        employeeId,
        leaveRequestId,
        reason: "no_eligible_hr_approver",
      });
      throw new Error(NO_HR_APPROVER_CONFIGURED_MESSAGE);
    }
    steps.push({ approverId: hrId, level: 1 });
    const ceoIds = await requireActiveCeoApproverEmployeeIds(
      supabase,
      organizationId,
    );
    for (const ceoId of ceoIds) {
      steps.push({ approverId: ceoId, level: 2 });
    }
  }

  const { error } = await supabase.schema("hrms").from("leave_approvals").insert(
    steps.map((step) => ({
      leave_request_id: leaveRequestId,
      approver_employee_id: step.approverId,
      approval_level: step.level,
      approval_status: "pending" as const,
      status: "active" as const,
      created_by: profile.userId,
      updated_by: profile.userId,
    })),
  );
  if (error) throw new Error(error.message);
}

export async function createLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: LeaveFormInput,
): Promise<string> {
  await assertEmployeeInOrganization(
    supabase,
    input.employeeId,
    profile.employee.organizationId,
  );

  await ensureEmployeeMonthlyLeaveAccruals(supabase, input.employeeId, {
    balanceYear: getCurrentBalanceYear(input.startDate),
    asOfDate: input.startDate,
    actorUserId: profile.userId,
  });
  await reconcileEmployeePaidLeaveLedger(supabase, input.employeeId, {
    balanceYear: getCurrentBalanceYear(input.startDate),
    actorUserId: profile.userId,
  });

  const evaluated = await evaluateLeaveApplication(
    supabase,
    profile.employee.organizationId,
    {
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      isHalfDay: input.isHalfDay,
      halfDayPeriod: input.isHalfDay ? input.halfDayPeriod || "afternoon" : null,
      enforceSelfServiceLimits: profile.employee.id === input.employeeId,
    },
  );
  const totalDays = evaluated.duration.totalLeaveDays;
  const balanceYear = getCurrentBalanceYear(input.startDate);
  const selfApply = profile.employee.id === input.employeeId;
  const hrReviewReason = selfApply ? hrReviewReasonFromIssues(evaluated.issues) : null;
  let { paidDays, lopDays } = evaluated.split;
  let durationBreakdown: Record<string, unknown> = {
    ...evaluated.duration,
    paidDays,
    lopDays,
    dayAllocations:
      evaluated.dayAllocations ??
      allocateLeaveDaysByBalance(evaluated.duration, paidDays, {
        calendar: evaluated.runtime.calendar,
        isPaidLeaveType: evaluated.leaveType.isPaid,
      }),
  };

  if (hrReviewReason) {
    paidDays = 0;
    lopDays = 0;
    durationBreakdown = attachHrReviewToBreakdown(
      {
        ...evaluated.duration,
        paidDays: 0,
        lopDays: 0,
        dayAllocations: evaluated.duration.days.map((day) => ({
          date: day.date,
          kind: "none" as const,
          counted: day.counted,
        })),
      },
      {
        required: true,
        reason: hrReviewReason,
        availableBalanceAtSubmit:
          typeof evaluated.availableBalance === "number" ? evaluated.availableBalance : null,
        employmentTypeCode: evaluated.employee.employmentTypeCode ?? null,
        employeeName:
          profile.employee.id === input.employeeId
            ? `${profile.employee.firstName} ${profile.employee.lastName}`.trim()
            : null,
        submittedAt: new Date().toISOString(),
      },
    );
  } else if (evaluated.leaveType.isPaid && paidDays > 0) {
    let openingAllocated = Math.max(Number(evaluated.leaveType.daysPerYear ?? 0), 0);
    let accruedThroughMonth: string | null = null;
    if (isMonthlyAccrualLeaveCode(evaluated.leaveType.code)) {
      const opening = await resolveMonthlyAccrualOpeningAllocation(
        supabase,
        input.employeeId,
        input.leaveTypeId,
        balanceYear,
        input.startDate,
      );
      openingAllocated = opening.allocatedDays;
      accruedThroughMonth = opening.accruedThroughMonth;
    }
    await ensureLeaveBalanceRow(
      supabase,
      input.employeeId,
      input.leaveTypeId,
      balanceYear,
      openingAllocated,
      profile.userId,
      { accruedThroughMonth },
    );
    const applied = await adjustLeaveBalance(supabase, input.employeeId, input.leaveTypeId, balanceYear, {
      pending: paidDays,
    });
    paidDays = roundLeaveDays(Math.max(0, applied.appliedPending));
    lopDays = roundLeaveDays(Math.max(0, totalDays - paidDays));
    durationBreakdown = {
      ...evaluated.duration,
      paidDays,
      lopDays,
      dayAllocations: allocateLeaveDaysByBalance(evaluated.duration, paidDays, {
        calendar: evaluated.runtime.calendar,
        isPaidLeaveType: evaluated.leaveType.isPaid,
      }),
    };
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .insert({
      employee_id: input.employeeId,
      leave_type_id: input.leaveTypeId,
      start_date: input.startDate,
      end_date: input.endDate,
      total_days: totalDays,
      is_half_day: input.isHalfDay,
      half_day_period: input.isHalfDay ? input.halfDayPeriod : null,
      reason: input.reason,
      emergency_contact_name: emptyToNull(input.emergencyContactName),
      emergency_contact_phone: emptyToNull(input.emergencyContactPhone),
      attachment_path: emptyToNull(input.attachmentPath),
      duration_breakdown: durationBreakdown,
      leave_status: "pending",
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (evaluated.leaveType.isPaid) {
      await adjustLeaveBalance(supabase, input.employeeId, input.leaveTypeId, balanceYear, {
        pending: -paidDays,
      }).catch(() => undefined);
    }
    throw new Error(error?.message ?? "Failed to create leave request");
  }

  const racedOverlap = await hasOverlappingLeave(
    supabase,
    input.employeeId,
    input.startDate,
    input.endDate,
    data.id,
  );
  if (racedOverlap) {
    if (evaluated.leaveType.isPaid) {
      await adjustLeaveBalance(supabase, input.employeeId, input.leaveTypeId, balanceYear, {
        pending: -paidDays,
      }).catch(() => undefined);
    }
    await supabase.schema("hrms").from("leave_requests").update({
      deleted_at: new Date().toISOString(),
      leave_status: "cancelled",
    }).eq("id", data.id);
    throw new Error(
      "You already have a pending or approved leave on one or more of these dates. Choose different dates, or cancel the existing request first.",
    );
  }

  try {
    await createApprovalSteps(
      supabase,
      profile,
      data.id,
      input.employeeId,
      evaluated.runtime.approvalLevels,
    );
  } catch (approvalError) {
    if (evaluated.leaveType.isPaid && paidDays > 0) {
      await adjustLeaveBalance(supabase, input.employeeId, input.leaveTypeId, balanceYear, {
        pending: -paidDays,
      }).catch(() => undefined);
    }
    await supabase.schema("hrms").from("leave_requests").update({
      deleted_at: new Date().toISOString(),
      leave_status: "cancelled",
    }).eq("id", data.id);
    throw approvalError;
  }

  if (hrReviewReason) {
    await notifyLeaveHrReviewSubmitted(supabase, profile, data.id, input.employeeId);
  } else {
    await notifyLeaveSubmitted(supabase, profile, data.id, input.employeeId);
    scheduleLeaveApprovalEmails(data.id, profile.userId);
  }
  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "leave",
    action: "create",
    description: hrReviewReason
      ? "Leave request submitted for HR review"
      : "Leave request submitted",
    recordId: data.id,
    metadata: {
      employeeId: input.employeeId,
      leaveType: evaluated.leaveType.code,
      totalDays,
      sandwichDays: evaluated.duration.sandwichDays,
      duration: evaluated.duration,
    },
  });
  emitHrmsWebhook(profile.employee.organizationId, "leave.created", {
    id: data.id,
    employeeId: input.employeeId,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  return data.id;
}

function canApproveLeave(profile: UserProfile): boolean {
  return (
    profile.permissionCodes.includes("leave.approve") ||
    isCeoLeaveApprover(profile) ||
    isHrLeaveActor(profile)
  );
}

function canRejectLeave(profile: UserProfile): boolean {
  return (
    profile.permissionCodes.includes("leave.reject") ||
    isCeoLeaveApprover(profile) ||
    isHrLeaveActor(profile)
  );
}

async function getPendingLeaveApprovalForActor(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  applicantEmployeeId: string,
  executiveApplicant: boolean,
) {
  const pending = await getPendingLeaveApproval(supabase, leaveRequestId);
  if (!pending) return null;
  const allowed = canActorDecideLeaveRequest({
    profile,
    applicantEmployeeId,
    leaveStatus: "pending",
    pendingLevel: pending.approval_level,
    pendingApproverEmployeeId: pending.approver_employee_id,
    executiveApplicant,
  });
  return allowed ? pending : null;
}

async function stampLeaveApprovalDecision(
  stepId: string,
  status: "approved" | "rejected",
  profile: UserProfile,
  comments?: string | null,
) {
  const actedAt = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .schema("hrms")
    .from("leave_approvals")
    .update({
      approval_status: status,
      comments: comments && comments.trim().length > 0 ? comments.trim() : null,
      acted_at: actedAt,
      updated_by: profile.userId,
      updated_at: actedAt,
    })
    .eq("id", stepId)
    .eq("approval_status", "pending")
    .is("deleted_at", null)
    .select("id, approval_level")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function getPendingLeaveApproval(
  supabase: AuthSupabaseClient,
  leaveRequestId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .select("id, approver_employee_id, approval_level")
    .eq("leave_request_id", leaveRequestId)
    .eq("approval_status", "pending")
    .is("deleted_at", null)
    .order("approval_level", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function cancelSiblingPendingApprovals(
  _supabase: AuthSupabaseClient,
  leaveRequestId: string,
  actingApproverEmployeeId: string,
  userId: string,
  approvalLevel?: number,
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  // Admin client avoids RLS on sibling CEO rows (authenticated UPDATE can fail WITH CHECK).
  let query = admin
    .schema("hrms")
    .from("leave_approvals")
    .update({
      approval_status: "skipped",
      deleted_at: now,
      updated_at: now,
      updated_by: userId,
    })
    .eq("leave_request_id", leaveRequestId)
    .eq("approval_status", "pending")
    .neq("approver_employee_id", actingApproverEmployeeId)
    .is("deleted_at", null);

  if (approvalLevel != null) {
    query = query.eq("approval_level", approvalLevel);
  }

  const { error } = await query;

  if (error) throw new Error(error.message);
}

/** Clear leftover pending approval rows after a leave is already finalized. */
async function clearRemainingPendingApprovals(
  _supabase: AuthSupabaseClient,
  leaveRequestId: string,
  userId: string,
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .schema("hrms")
    .from("leave_approvals")
    .update({
      approval_status: "skipped",
      deleted_at: now,
      updated_at: now,
      updated_by: userId,
    })
    .eq("leave_request_id", leaveRequestId)
    .eq("approval_status", "pending")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

async function throwIfLeaveAlreadyProcessed(
  supabase: AuthSupabaseClient,
  leaveRequestId: string,
  executiveApplicant: boolean,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("leave_status")
    .eq("id", leaveRequestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Leave request not found");

  if (data.leave_status === "approved") {
    throw new Error(
      executiveApplicant
        ? LEAVE_ALREADY_APPROVED_BY_OTHER_CEO_MESSAGE
        : LEAVE_ALREADY_PROCESSED_MESSAGE,
    );
  }
  if (data.leave_status === "rejected" || data.leave_status === "cancelled") {
    throw new Error(LEAVE_ALREADY_PROCESSED_MESSAGE);
  }
}

async function assertCanActOnLeaveApproval(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
  action: "approve" | "reject",
): Promise<void> {
  const executiveApplicant = requiresCeoLeaveApproval(
    await getEmployeeRoleCodes(supabase, employeeId),
  );
  const pendingApproval = await getPendingLeaveApprovalForActor(
    supabase,
    profile,
    leaveRequestId,
    employeeId,
    executiveApplicant,
  );
  if (!pendingApproval) {
    await throwIfLeaveAlreadyProcessed(
      supabase,
      leaveRequestId,
      executiveApplicant,
    );
    throw new Error("You are not authorized to act on this leave request");
  }

  if (executiveApplicant && !isCeoLeaveApprover(profile)) {
    throw new Error(
      "Only the CEO can approve or reject HR and Manager leave requests",
    );
  }

  if (
    action === "approve" &&
    !canApproveLeave(profile) &&
    pendingApproval.approver_employee_id !== profile.employee.id
  ) {
    throw new Error("You are not authorized to approve this request");
  }
  if (
    action === "reject" &&
    !canRejectLeave(profile) &&
    pendingApproval.approver_employee_id !== profile.employee.id
  ) {
    throw new Error("You are not authorized to reject this request");
  }
}

async function finalizeApprovalIfComplete(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
) {
  const { data: request, error: requestError } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select(
      "employee_id, leave_type_id, start_date, end_date, total_days, duration_breakdown, is_half_day, half_day_period, leave_status",
    )
    .eq("id", leaveRequestId)
    .single();

  if (requestError || !request) throw new Error(requestError?.message ?? "Not found");
  if (request.leave_status !== "pending") return;

  const { data: approvals, error: approvalsError } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .select("approval_status")
    .eq("leave_request_id", leaveRequestId)
    .is("deleted_at", null);

  if (approvalsError) throw new Error(approvalsError.message);

  const rows = approvals ?? [];
  const anyRejected = rows.some((a) => a.approval_status === "rejected");
  if (anyRejected) return;

  const allApproved =
    rows.length === 0 || rows.every((a) => a.approval_status === "approved");
  if (!allApproved) return;

  const evaluated = await evaluateLeaveApplication(
    supabase,
    profile.employee.organizationId,
    {
      employeeId: request.employee_id,
      leaveTypeId: request.leave_type_id,
      startDate: request.start_date,
      endDate: request.end_date,
      isHalfDay: Boolean(request.is_half_day),
      halfDayPeriod: request.half_day_period,
      excludeRequestId: leaveRequestId,
      skipNotice: true,
    },
  );

  const balanceYear = getCurrentBalanceYear(request.start_date);
  const approved = resolveApprovedSplit(request, evaluated.duration.totalLeaveDays);

  const { data: finalized, error: finalizeError } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .update({
      leave_status: "approved",
      total_days: evaluated.duration.totalLeaveDays,
      duration_breakdown: durationBreakdownWithSplit(
        evaluated.duration,
        approved.paidDays,
        approved.lopDays,
      ),
      updated_by: profile.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveRequestId)
    .eq("leave_status", "pending")
    .select("id")
    .maybeSingle();

  if (finalizeError) throw new Error(finalizeError.message);
  if (!finalized) return;

  if (evaluated.leaveType.isPaid) {
    await adjustLeaveBalance(
      supabase,
      request.employee_id,
      request.leave_type_id,
      balanceYear,
      { pending: -approved.reservedDays, used: approved.paidDays },
    );
  }

  await notifyLeaveApproved(supabase, profile, leaveRequestId, request.employee_id);
  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "leave",
    action: "approve",
    description: "Leave request fully approved",
    recordId: leaveRequestId,
    metadata: {
      employeeId: request.employee_id,
      totalDays: evaluated.duration.totalLeaveDays,
      sandwichDays: evaluated.duration.sandwichDays,
      duration: evaluated.duration,
    },
  });
  emitHrmsWebhook(profile.employee.organizationId, "leave.approved", {
    id: leaveRequestId,
    employeeId: request.employee_id,
  });
  await syncAttendanceForApprovedLeave(supabase, profile, {
    employeeId: request.employee_id,
    leaveRequestId,
    duration: evaluated.duration,
  });
  await refreshDraftPayrollAfterLeaveChange(supabase, profile, request.employee_id);
}

export async function approveLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  comments?: string,
): Promise<void> {
  const { data: request, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select(
      "id, employee_id, leave_status, leave_type_id, start_date, end_date, total_days, duration_breakdown, is_half_day, half_day_period",
    )
    .eq("id", leaveRequestId)
    .single();

  if (error || !request) throw new Error(error?.message ?? "Leave request not found");

  // Idempotent: earlier multi-CEO approve may have finalized leave_status before
  // sibling pending rows were cleared. Treat as success and clean leftovers.
  if (request.leave_status === "approved") {
    await clearRemainingPendingApprovals(supabase, leaveRequestId, profile.userId);
    return;
  }

  if (request.leave_status !== "pending") {
    throw new Error("Only pending requests can be approved");
  }

  if (isPendingHrReview(request.leave_status, request.duration_breakdown)) {
    const meta = parseHrReviewMetadata(request.duration_breakdown);
    const decision = meta?.reason === "over_limit" ? "special" : "lop";
    await decideHrLeaveReview(
      supabase,
      profile,
      leaveRequestId,
      decision,
      comments?.trim() || "Approved",
    );
    return;
  }

  const applicantRoles = await getEmployeeRoleCodes(supabase, request.employee_id);
  const executiveApplicant = requiresCeoLeaveApproval(applicantRoles);

  await assertCanActOnLeaveApproval(
    supabase,
    profile,
    leaveRequestId,
    request.employee_id,
    "approve",
  );

  const actedAt = new Date().toISOString();
  const pendingStep = await getPendingLeaveApprovalForActor(
    supabase,
    profile,
    leaveRequestId,
    request.employee_id,
    executiveApplicant,
  );
  if (!pendingStep) {
    await throwIfLeaveAlreadyProcessed(supabase, leaveRequestId, executiveApplicant);
    throw new Error("This approval step was already processed");
  }

  if (executiveApplicant) {
    const evaluated = await evaluateLeaveApplication(
      supabase,
      profile.employee.organizationId,
      {
        employeeId: request.employee_id,
        leaveTypeId: request.leave_type_id,
        startDate: request.start_date,
        endDate: request.end_date,
        isHalfDay: Boolean(request.is_half_day),
        halfDayPeriod: request.half_day_period,
        excludeRequestId: leaveRequestId,
        skipNotice: true,
      },
    );

    const balanceYear = getCurrentBalanceYear(request.start_date);
    const approved = resolveApprovedSplit(request, evaluated.duration.totalLeaveDays);

    const { data: finalized, error: finalizeError } = await supabase
      .schema("hrms")
      .from("leave_requests")
      .update({
        leave_status: "approved",
        total_days: evaluated.duration.totalLeaveDays,
        duration_breakdown: durationBreakdownWithSplit(
          evaluated.duration,
          approved.paidDays,
          approved.lopDays,
        ),
        updated_by: profile.userId,
        updated_at: actedAt,
      })
      .eq("id", leaveRequestId)
      .eq("leave_status", "pending")
      .select("id")
      .maybeSingle();

    if (finalizeError) throw new Error(finalizeError.message);
    if (!finalized) {
      await throwIfLeaveAlreadyProcessed(supabase, leaveRequestId, true);
      throw new Error(LEAVE_ALREADY_PROCESSED_MESSAGE);
    }

    const { data: updatedStep, error: updateError } = await createAdminClient()
      .schema("hrms")
      .from("leave_approvals")
      .update({
        approval_status: "approved",
        comments: emptyToNull(comments),
        acted_at: actedAt,
        updated_by: profile.userId,
        updated_at: actedAt,
      })
      .eq("id", pendingStep.id)
      .eq("approval_status", "pending")
      .is("deleted_at", null)
      .select("id, approval_level")
      .maybeSingle();

    if (updateError) throw new Error(updateError.message);
    if (!updatedStep) {
      throw new Error("This approval step was already processed");
    }

    await cancelSiblingPendingApprovals(
      supabase,
      leaveRequestId,
      profile.employee.id,
      profile.userId,
      pendingStep.approval_level,
    );

    if (evaluated.leaveType.isPaid) {
      await adjustLeaveBalance(
        supabase,
        request.employee_id,
        request.leave_type_id,
        balanceYear,
        { pending: -approved.reservedDays, used: approved.paidDays },
      );
    }

    await notifyLeaveApproved(supabase, profile, leaveRequestId, request.employee_id);
    await writeApplicationAudit(supabase, {
      organizationId: profile.employee.organizationId,
      module: "leave",
      action: "approve",
      description: "Leave request approved by CEO",
      recordId: leaveRequestId,
      metadata: {
        approvalLevel: updatedStep.approval_level,
        approverEmployeeId: profile.employee.id,
        totalDays: evaluated.duration.totalLeaveDays,
        sandwichDays: evaluated.duration.sandwichDays,
        duration: evaluated.duration,
      },
    });
    emitHrmsWebhook(profile.employee.organizationId, "leave.approved", {
      id: leaveRequestId,
      employeeId: request.employee_id,
    });
    await syncAttendanceForApprovedLeave(supabase, profile, {
      employeeId: request.employee_id,
      leaveRequestId,
      duration: evaluated.duration,
    });
    await refreshDraftPayrollAfterLeaveChange(supabase, profile, request.employee_id);
    return;
  }

  const { data: updatedStep, error: updateError } = await createAdminClient()
    .schema("hrms")
    .from("leave_approvals")
    .update({
      approval_status: "approved",
      comments: emptyToNull(comments),
      acted_at: actedAt,
      updated_by: profile.userId,
      updated_at: actedAt,
    })
    .eq("id", pendingStep.id)
    .eq("approval_status", "pending")
    .is("deleted_at", null)
    .select("id, approval_level")
    .maybeSingle();

  if (updateError) throw new Error(updateError.message);
  if (!updatedStep) {
    throw new Error("This approval step was already processed");
  }

  const approvalActorLabel =
    isCeoLeaveApprover(profile) || updatedStep.approval_level === 2
      ? "CEO"
      : "HR";

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "leave",
    action: "approve",
    description: `Leave request approved by ${approvalActorLabel}`,
    recordId: leaveRequestId,
    metadata: { approvalLevel: updatedStep.approval_level },
  });

  // First HR or CEO accept fully approves employee leave (no second wait).
  await clearRemainingPendingApprovals(supabase, leaveRequestId, profile.userId);
  await finalizeApprovalIfComplete(supabase, profile, leaveRequestId);
}

export async function rejectLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  comments: string,
): Promise<void> {
  const { data: request, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select(
      "id, employee_id, leave_type_id, start_date, total_days, duration_breakdown, leave_status",
    )
    .eq("id", leaveRequestId)
    .single();

  if (error || !request) throw new Error(error?.message ?? "Leave request not found");

  if (request.leave_status === "rejected" || request.leave_status === "approved") {
    await clearRemainingPendingApprovals(supabase, leaveRequestId, profile.userId);
    if (request.leave_status === "rejected") return;
    throw new Error(LEAVE_ALREADY_PROCESSED_MESSAGE);
  }

  if (request.leave_status !== "pending") {
    throw new Error("Only pending requests can be rejected");
  }

  if (isPendingHrReview(request.leave_status, request.duration_breakdown)) {
    await decideHrLeaveReview(
      supabase,
      profile,
      leaveRequestId,
      "reject",
      comments.trim(),
    );
    return;
  }

  await assertCanActOnLeaveApproval(
    supabase,
    profile,
    leaveRequestId,
    request.employee_id,
    "reject",
  );

  const executiveApplicant = requiresCeoLeaveApproval(
    await getEmployeeRoleCodes(supabase, request.employee_id),
  );
  const pendingStep = await getPendingLeaveApprovalForActor(
    supabase,
    profile,
    leaveRequestId,
    request.employee_id,
    executiveApplicant,
  );
  if (!pendingStep) {
    await throwIfLeaveAlreadyProcessed(supabase, leaveRequestId, executiveApplicant);
    throw new Error("This approval step was already processed");
  }

  const approvalRow = await stampLeaveApprovalDecision(
    pendingStep.id,
    "rejected",
    profile,
    comments,
  );
  if (!approvalRow) {
    await throwIfLeaveAlreadyProcessed(supabase, leaveRequestId, executiveApplicant);
    throw new Error("This approval step was already processed");
  }

  const { data: rejected, error: updateError } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .update({
      leave_status: "rejected",
      updated_by: profile.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveRequestId)
    .eq("leave_status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) throw new Error(updateError.message);
  if (!rejected) {
    await throwIfLeaveAlreadyProcessed(
      supabase,
      leaveRequestId,
      requiresCeoLeaveApproval(await getEmployeeRoleCodes(supabase, request.employee_id)),
    );
    throw new Error("This leave request was already processed");
  }

  await cancelSiblingPendingApprovals(
    supabase,
    leaveRequestId,
    profile.employee.id,
    profile.userId,
  );

  const { data: leaveType } = await supabase
    .schema("hrms")
    .from("leave_types")
    .select("is_paid")
    .eq("id", request.leave_type_id)
    .maybeSingle();

  if (leaveType?.is_paid !== false) {
    const balanceYear = getCurrentBalanceYear(request.start_date);
    await adjustLeaveBalance(
      supabase,
      request.employee_id,
      request.leave_type_id,
      balanceYear,
      { pending: -reservedPaidDays(request) },
    );
  }

  await notifyLeaveRejected(supabase, profile, leaveRequestId, request.employee_id);
  const rejectActorLabel =
    approvalRow.approval_level === 1
      ? "HR"
      : approvalRow.approval_level === 2
        ? "CEO"
        : "approver";

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "leave",
    action: "reject",
    description: `Leave request rejected by ${rejectActorLabel}`,
    recordId: leaveRequestId,
    reason: comments,
    metadata: {
      approvalLevel: approvalRow.approval_level,
      balanceRestored: leaveType?.is_paid !== false,
      totalDays: Number(request.total_days),
    },
  });
  emitHrmsWebhook(profile.employee.organizationId, "leave.rejected", {
    id: leaveRequestId,
    employeeId: request.employee_id,
  });
}

export async function decideHrLeaveReview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  decision: "lop" | "special" | "reject",
  remarks: string,
): Promise<void> {
  if (
    !isHrLeaveActor(profile) &&
    !isCeoLeaveApprover(profile) &&
    !profile.permissionCodes.includes("leave.approve")
  ) {
    throw new Error("You are not authorized to review this leave request");
  }

  const { data: request, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select(
      "id, employee_id, leave_type_id, start_date, end_date, total_days, duration_breakdown, leave_status, is_half_day",
    )
    .eq("id", leaveRequestId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !request) throw new Error(error?.message ?? "Leave request not found");
  if (!isPendingHrReview(request.leave_status, request.duration_breakdown)) {
    throw new Error("This request is not pending HR review");
  }

  const trimmed =
    remarks.trim() ||
    (decision === "lop"
      ? "Approved as Loss of Pay"
      : decision === "special"
        ? "Approved as Special Leave"
        : "");
  if (decision === "reject" && trimmed.length < 3) {
    throw new Error("Remarks are required");
  }

  const existing = parseHrReviewMetadata(request.duration_breakdown) ?? {
    required: true as const,
    reason: "balance_exhausted" as const,
    availableBalanceAtSubmit: null,
    employmentTypeCode: null,
    employeeName: null,
    submittedAt: new Date().toISOString(),
  };

  const nextStatus = decision === "reject" ? "rejected" : "approved";
  const baseBreakdown =
    request.duration_breakdown && typeof request.duration_breakdown === "object"
      ? { ...(request.duration_breakdown as Record<string, unknown>) }
      : {};

  let durationBreakdown = attachHrReviewToBreakdown(baseBreakdown, {
    ...existing,
    decision: decision === "reject" ? null : decision,
    remarks: trimmed,
    decidedAt: new Date().toISOString(),
    decidedByEmployeeId: profile.employee.id,
    decidedByRole: isCeoLeaveApprover(profile) && !isHrLeaveActor(profile) ? "ceo" : "hr",
  });

  if (decision === "lop") {
    const totalDays = Number(request.total_days);
    durationBreakdown = {
      ...durationBreakdown,
      paidDays: 0,
      lopDays: totalDays,
      specialLeave: false,
      dayAllocations: Array.isArray(durationBreakdown.dayAllocations)
        ? (durationBreakdown.dayAllocations as Array<{ date: string; counted: number }>).map(
            (day) => ({
              date: day.date,
              kind: "lop" as const,
              counted: day.counted,
            }),
          )
        : [],
    };
  } else if (decision === "special") {
    durationBreakdown = {
      ...durationBreakdown,
      paidDays: 0,
      lopDays: 0,
      specialLeave: true,
    };
  }

  const actedAt = new Date().toISOString();
  const admin = createAdminClient();
  const { data: updated, error: updateError } = await admin
    .schema("hrms")
    .from("leave_requests")
    .update({
      leave_status: nextStatus,
      duration_breakdown: durationBreakdown,
      updated_by: profile.userId,
      updated_at: actedAt,
    })
    .eq("id", leaveRequestId)
    .eq("leave_status", "pending")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (updateError) throw new Error(updateError.message);
  if (!updated) {
    throw new Error("This leave request was already processed");
  }

  await clearRemainingPendingApprovals(supabase, leaveRequestId, profile.userId);

  try {
    await notifyLeaveHrReviewDecided(
      supabase,
      profile,
      leaveRequestId,
      request.employee_id,
      decision,
      trimmed,
    );
  } catch (notifyError) {
    console.error("[leave] HR review notification failed", notifyError);
  }
  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "leave",
    action: decision === "reject" ? "reject" : "approve",
    description:
      decision === "reject"
        ? "Leave request rejected after HR review"
        : decision === "lop"
          ? "Leave request approved as LOP after HR review"
          : "Leave request approved as Special Leave after HR review",
    recordId: leaveRequestId,
    reason: trimmed,
    metadata: {
      hrReview: true,
      decision,
      employeeId: request.employee_id,
      totalDays: Number(request.total_days),
    },
  });
  emitHrmsWebhook(
    profile.employee.organizationId,
    decision === "reject" ? "leave.rejected" : "leave.approved",
    { id: leaveRequestId, employeeId: request.employee_id },
  );
  if (decision !== "reject") {
    const duration = request.duration_breakdown as LeaveDurationBreakdown | null;
    if (duration?.days?.length) {
      await syncAttendanceForApprovedLeave(supabase, profile, {
        employeeId: request.employee_id,
        leaveRequestId,
        duration,
      });
    }
    await refreshDraftPayrollAfterLeaveChange(supabase, profile, request.employee_id);
  }
}

export async function cancelLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
): Promise<void> {
  const { data: request, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select(
      "id, employee_id, leave_type_id, start_date, total_days, duration_breakdown, leave_status",
    )
    .eq("id", leaveRequestId)
    .single();

  if (error || !request) throw new Error(error?.message ?? "Leave request not found");

  const isOwner = request.employee_id === profile.employee.id;
  const canCancelOthers = profile.permissionCodes.includes("leave.cancel");

  if (!isOwner && !canCancelOthers) {
    throw new Error("You are not authorized to cancel this request");
  }

  if (!["pending", "approved"].includes(request.leave_status)) {
    throw new Error("This leave request cannot be cancelled");
  }

  const previousStatus = request.leave_status;
  const { data: cancelled, error: updateError } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .update({
      leave_status: "cancelled",
      updated_by: profile.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveRequestId)
    .in("leave_status", ["pending", "approved"])
    .select("id")
    .maybeSingle();

  if (updateError) throw new Error(updateError.message);
  if (!cancelled) {
    throw new Error("This leave request was already processed");
  }

  const { data: leaveType } = await supabase
    .schema("hrms")
    .from("leave_types")
    .select("is_paid")
    .eq("id", request.leave_type_id)
    .maybeSingle();

  const balanceYear = getCurrentBalanceYear(request.start_date);
  const totalDays = Number(request.total_days);
  const reserved = reservedPaidDays(request);

  if (leaveType?.is_paid !== false) {
    if (previousStatus === "pending") {
      await adjustLeaveBalance(supabase, request.employee_id, request.leave_type_id, balanceYear, {
        pending: -reserved,
      });
    } else if (previousStatus === "approved") {
      await adjustLeaveBalance(supabase, request.employee_id, request.leave_type_id, balanceYear, {
        used: -reserved,
      });
    }
  }

  const managerId = await getEmployeeReportingManagerId(
    supabase,
    request.employee_id,
  );
  await notifyLeaveCancelled(
    supabase,
    profile,
    leaveRequestId,
    request.employee_id,
    managerId,
  );
  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "leave",
    action: "cancel",
    description: "Leave request cancelled",
    recordId: leaveRequestId,
    metadata: { previousStatus, totalDays, balanceRestored: leaveType?.is_paid !== false },
  });
  if (previousStatus === "approved") {
    const duration = request.duration_breakdown as LeaveDurationBreakdown | null;
    await clearAttendanceForLeaveRequest(supabase, profile, {
      employeeId: request.employee_id,
      leaveRequestId,
      duration,
    });
    await refreshDraftPayrollAfterLeaveChange(supabase, profile, request.employee_id);
  }
}

export async function deleteLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
): Promise<void> {
  const codes = profile.permissionCodes;
  const hasHrDelete =
    codes.includes("leave.delete") || codes.includes("leave.cancel");
  const hasWithdraw = codes.includes("leave.withdraw");

  if (!hasHrDelete && !hasWithdraw) {
    throw new Error("You are not authorized to delete this leave request");
  }

  if (!hasHrDelete) {
    const { data: request, error: requestError } = await supabase
      .schema("hrms")
      .from("leave_requests")
      .select("id, employee_id, leave_status")
      .eq("id", leaveRequestId)
      .is("deleted_at", null)
      .maybeSingle();

    if (requestError || !request) {
      throw new Error(requestError?.message ?? "Leave request not found");
    }
    if (request.employee_id !== profile.employee.id) {
      throw new Error("You can only delete your own leave requests");
    }
    if (request.leave_status !== "pending") {
      throw new Error("You can only delete pending leave requests");
    }
  }

  const { data, error } = await supabase.schema("hrms").rpc("soft_delete_leave_request", {
    p_leave_request_id: leaveRequestId,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Leave request not found or already deleted.");
}

export async function updateLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  input: LeaveFormInput,
): Promise<void> {
  const { data: request, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select(
      "id, employee_id, leave_type_id, start_date, end_date, total_days, duration_breakdown, leave_status",
    )
    .eq("id", leaveRequestId)
    .is("deleted_at", null)
    .single();

  if (error || !request) throw new Error(error?.message ?? "Leave request not found");
  if (request.leave_status !== "pending") {
    throw new Error("Only pending leave requests can be edited");
  }

  const isOwner = request.employee_id === profile.employee.id;
  const isHrOrAdmin = profile.roles.some((r) =>
    ["hr_admin", "hr_executive", "super_admin"].includes(r.code),
  );
  const hasEditPermission =
    profile.permissionCodes.includes("leave.edit") ||
    (isOwner && profile.permissionCodes.includes("leave.create"));

  if (!hasEditPermission) {
    throw new Error("You are not authorized to edit this leave request");
  }
  if (!isOwner && !isHrOrAdmin) {
    throw new Error("You can only edit your own leave requests");
  }
  if (input.employeeId !== request.employee_id) {
    throw new Error("Employee cannot be changed when editing a leave request");
  }

  await assertEmployeeInOrganization(
    supabase,
    input.employeeId,
    profile.employee.organizationId,
  );

  const next = await evaluateLeaveApplication(
    supabase,
    profile.employee.organizationId,
    {
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      isHalfDay: input.isHalfDay,
      halfDayPeriod: input.isHalfDay ? input.halfDayPeriod || "afternoon" : null,
      excludeRequestId: leaveRequestId,
      enforceSelfServiceLimits: profile.employee.id === input.employeeId,
    },
  );
  const nextTotalDays = next.duration.totalLeaveDays;
  const previousReservedDays = reservedPaidDays(request);
  const previousBalanceYear = getCurrentBalanceYear(request.start_date);
  const nextBalanceYear = getCurrentBalanceYear(input.startDate);

  const { data: previousType } = await supabase
    .schema("hrms")
    .from("leave_types")
    .select("is_paid")
    .eq("id", request.leave_type_id)
    .maybeSingle();

  if (previousType?.is_paid !== false) {
    await adjustLeaveBalance(
      supabase,
      request.employee_id,
      request.leave_type_id,
      previousBalanceYear,
      { pending: -previousReservedDays },
    );
  }

  // The edit re-reserves against the same ledger row, so the days this request is
  // already holding must be credited back before splitting paid days from LOP.
  const reusesSameBalanceBucket =
    previousType?.is_paid !== false &&
    request.leave_type_id === input.leaveTypeId &&
    previousBalanceYear === nextBalanceYear;
  const nextAvailableBalance =
    next.availableBalance == null
      ? null
      : next.availableBalance + (reusesSameBalanceBucket ? previousReservedDays : 0);
  const nextSplit = splitLeaveDaysByBalance({
    totalDays: nextTotalDays,
    availableBalance: nextAvailableBalance,
    isPaid: next.leaveType.isPaid,
  });

  try {
    if (next.leaveType.isPaid && nextSplit.paidDays > 0) {
      await ensureLeaveBalanceRow(
        supabase,
        input.employeeId,
        input.leaveTypeId,
        nextBalanceYear,
        Math.max(Number(next.leaveType.daysPerYear ?? 0), 0),
        profile.userId,
      );
      await adjustLeaveBalance(
        supabase,
        input.employeeId,
        input.leaveTypeId,
        nextBalanceYear,
        { pending: nextSplit.paidDays },
      );
    }
  } catch (balanceError) {
    if (previousType?.is_paid !== false) {
      await adjustLeaveBalance(
        supabase,
        request.employee_id,
        request.leave_type_id,
        previousBalanceYear,
        { pending: previousReservedDays },
      );
    }
    throw balanceError;
  }

  const { error: updateError } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .update({
      leave_type_id: input.leaveTypeId,
      start_date: input.startDate,
      end_date: input.endDate,
      total_days: nextTotalDays,
      is_half_day: input.isHalfDay,
      half_day_period: input.isHalfDay ? input.halfDayPeriod || null : null,
      reason: input.reason,
      emergency_contact_name: emptyToNull(input.emergencyContactName),
      emergency_contact_phone: emptyToNull(input.emergencyContactPhone),
      attachment_path: emptyToNull(input.attachmentPath),
      duration_breakdown: durationBreakdownWithSplit(
        next.duration,
        nextSplit.paidDays,
        nextSplit.lopDays,
      ),
      updated_by: profile.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveRequestId);

  if (updateError) {
    if (next.leaveType.isPaid) {
      await adjustLeaveBalance(
        supabase,
        input.employeeId,
        input.leaveTypeId,
        nextBalanceYear,
        { pending: -nextSplit.paidDays },
      );
    }
    if (previousType?.is_paid !== false) {
      await adjustLeaveBalance(
        supabase,
        request.employee_id,
        request.leave_type_id,
        previousBalanceYear,
        { pending: previousReservedDays },
      );
    }
    throw new Error(updateError.message);
  }

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "leave",
    action: "update",
    description: "Leave request edited",
    recordId: leaveRequestId,
    metadata: { totalDays: nextTotalDays, duration: next.duration },
  });
}

