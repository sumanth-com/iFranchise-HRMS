import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { LeaveFormInput } from "@/lib/validations/leave";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import { getCurrentBalanceYear } from "@/lib/leave/services/leave-utils";
import {
  getEmployeeReportingManagerId,
  getEmployeeRoleCodes,
  getHrApproverEmployeeId,
  isCeoLeaveApprover,
  LEAVE_ALREADY_APPROVED_BY_OTHER_CEO_MESSAGE,
  LEAVE_ALREADY_PROCESSED_MESSAGE,
  NO_HR_APPROVER_CONFIGURED_MESSAGE,
  requireActiveCeoApproverEmployeeIds,
} from "@/lib/leave/services/leave-queries";
import { requiresCeoLeaveApproval } from "@/lib/approvals/executive-request-routing";
import { evaluateLeaveApplication } from "@/lib/leave/services/leave-policy-runtime";
import { NON_APPLY_LEAVE_TYPE_CODES } from "@/lib/leave/constants";
import {
  notifyLeaveApproved,
  notifyLeaveCancelled,
  notifyLeaveRejected,
  notifyLeaveSubmitted,
} from "@/lib/leave/services/leave-notifications";
import { emitHrmsWebhook } from "@/lib/public-api/emit";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
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
  const balance = await getLeaveBalanceRow(
    supabase,
    employeeId,
    leaveTypeId,
    balanceYear,
  );

  if (!balance) {
    throw new Error("Leave balance not configured for this employee and leave type");
  }

  const pendingDays = Number(balance.pending_days) + (delta.pending ?? 0);
  const usedDays = Number(balance.used_days) + (delta.used ?? 0);
  const allocatedDays = Number(balance.allocated_days);
  const balanceDays = allocatedDays - usedDays - pendingDays;

  if (balanceDays < 0) {
    throw new Error("Insufficient leave balance");
  }

  const { error, data } = await supabase
    .schema("hrms")
    .from("leave_balances")
    .update({
      pending_days: pendingDays,
      used_days: usedDays,
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
}

async function ensureLeaveBalanceRow(
  supabase: AuthSupabaseClient,
  employeeId: string,
  leaveTypeId: string,
  balanceYear: number,
  allocatedDays: number,
  userId: string,
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
  approvalLevels: number,
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
    const managerId = await getEmployeeReportingManagerId(supabase, employeeId);
    const excludeFromHr = [employeeId, managerId].filter(
      (id): id is string => Boolean(id),
    );
    const hrId = await getHrApproverEmployeeId(supabase, organizationId, {
      employeeId,
      excludeEmployeeIds: excludeFromHr,
    });
    const wantsTwoLevel = approvalLevels >= 2;
    const hasDistinctManager =
      Boolean(managerId) && managerId !== employeeId;

    if (wantsTwoLevel && hasDistinctManager) {
      if (!hrId) {
        console.error("[leave] HR approver routing failed (fail-closed)", {
          organizationId,
          employeeId,
          managerId,
          leaveRequestId,
          reason: "missing_or_invalid_assigned_and_default_hr",
        });
        throw new Error(NO_HR_APPROVER_CONFIGURED_MESSAGE);
      }
      steps.push({ approverId: managerId!, level: 1 });
      steps.push({ approverId: hrId, level: 2 });
    } else if (hasDistinctManager) {
      steps.push({ approverId: managerId!, level: 1 });
    } else if (hrId) {
      steps.push({ approverId: hrId, level: 1 });
    } else {
      console.error("[leave] HR approver routing failed (fail-closed)", {
        organizationId,
        employeeId,
        managerId,
        leaveRequestId,
        reason: "no_manager_and_no_valid_hr",
      });
      throw new Error(NO_HR_APPROVER_CONFIGURED_MESSAGE);
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

  const evaluated = await evaluateLeaveApplication(
    supabase,
    profile.employee.organizationId,
    {
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      startDate: input.startDate,
      endDate: input.endDate,
      isHalfDay: input.isHalfDay,
    },
  );
  const applyCode = evaluated.leaveType.code.toUpperCase();
  if (
    NON_APPLY_LEAVE_TYPE_CODES.includes(
      applyCode as (typeof NON_APPLY_LEAVE_TYPE_CODES)[number],
    )
  ) {
    throw new Error(
      "Optional Holiday cannot be applied here. Use the Optional Holiday workflow instead.",
    );
  }
  const totalDays = evaluated.duration.totalLeaveDays;
  const balanceYear = getCurrentBalanceYear(input.startDate);

  if (evaluated.leaveType.isPaid) {
    await ensureLeaveBalanceRow(
      supabase,
      input.employeeId,
      input.leaveTypeId,
      balanceYear,
      Math.max(evaluated.availableBalance ?? 0, totalDays),
      profile.userId,
    );
    await adjustLeaveBalance(supabase, input.employeeId, input.leaveTypeId, balanceYear, {
      pending: totalDays,
    });
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
      duration_breakdown: evaluated.duration,
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
        pending: -totalDays,
      }).catch(() => undefined);
    }
    throw new Error(error?.message ?? "Failed to create leave request");
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
    if (evaluated.leaveType.isPaid) {
      await adjustLeaveBalance(supabase, input.employeeId, input.leaveTypeId, balanceYear, {
        pending: -totalDays,
      }).catch(() => undefined);
    }
    await supabase.schema("hrms").from("leave_requests").update({
      deleted_at: new Date().toISOString(),
      leave_status: "cancelled",
    }).eq("id", data.id);
    throw approvalError;
  }

  await notifyLeaveSubmitted(supabase, profile, data.id, input.employeeId);
  await dispatchLeaveApprovalEmails(data.id, profile.userId);
  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "leave",
    action: "create",
    description: "Leave request submitted",
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
  return profile.permissionCodes.includes("leave.approve");
}

function canRejectLeave(profile: UserProfile): boolean {
  return profile.permissionCodes.includes("leave.reject");
}

async function getPendingLeaveApprovalForActor(
  supabase: AuthSupabaseClient,
  leaveRequestId: string,
  actorEmployeeId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .select("id, approver_employee_id, approval_level")
    .eq("leave_request_id", leaveRequestId)
    .eq("approver_employee_id", actorEmployeeId)
    .eq("approval_status", "pending")
    .is("deleted_at", null)
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
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  // Admin client avoids RLS on sibling CEO rows (authenticated UPDATE can fail WITH CHECK).
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
    .neq("approver_employee_id", actingApproverEmployeeId)
    .is("deleted_at", null);

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
  const pendingApproval = await getPendingLeaveApprovalForActor(
    supabase,
    leaveRequestId,
    profile.employee.id,
  );
  if (!pendingApproval) {
    await throwIfLeaveAlreadyProcessed(
      supabase,
      leaveRequestId,
      requiresCeoLeaveApproval(await getEmployeeRoleCodes(supabase, employeeId)),
    );
    throw new Error("You are not the assigned approver for this request");
  }

  const applicantRoles = await getEmployeeRoleCodes(supabase, employeeId);
  const executiveApplicant = requiresCeoLeaveApproval(applicantRoles);

  if (executiveApplicant) {
    if (!isCeoLeaveApprover(profile)) {
      throw new Error(
        "Only the CEO can approve or reject HR and Manager leave requests",
      );
    }
    return;
  }

  const isAssigned = pendingApproval.approver_employee_id === profile.employee.id;
  if (isAssigned) return;

  if (action === "approve" && !canApproveLeave(profile)) {
    throw new Error("You are not authorized to approve this request");
  }
  if (action === "reject" && !canRejectLeave(profile)) {
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
    .select("employee_id, leave_type_id, start_date, end_date, total_days, is_half_day, leave_status")
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
      excludeRequestId: leaveRequestId,
      skipNotice: true,
    },
  );

  const balanceYear = getCurrentBalanceYear(request.start_date);
  const totalDays = Number(request.total_days);

  const { data: finalized, error: finalizeError } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .update({
      leave_status: "approved",
      total_days: evaluated.duration.totalLeaveDays,
      duration_breakdown: evaluated.duration,
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
      { pending: -totalDays, used: evaluated.duration.totalLeaveDays },
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
    .select("id, employee_id, leave_status, leave_type_id, start_date, end_date, total_days, is_half_day")
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
    leaveRequestId,
    profile.employee.id,
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
        excludeRequestId: leaveRequestId,
        skipNotice: true,
      },
    );

    const balanceYear = getCurrentBalanceYear(request.start_date);
    const totalDays = Number(request.total_days);

    const { data: finalized, error: finalizeError } = await supabase
      .schema("hrms")
      .from("leave_requests")
      .update({
        leave_status: "approved",
        total_days: evaluated.duration.totalLeaveDays,
        duration_breakdown: evaluated.duration,
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
    );

    if (evaluated.leaveType.isPaid) {
      await adjustLeaveBalance(
        supabase,
        request.employee_id,
        request.leave_type_id,
        balanceYear,
        { pending: -totalDays, used: evaluated.duration.totalLeaveDays },
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
    return;
  }

  const { data: updatedStep, error: updateError } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .update({
      approval_status: "approved",
      comments: emptyToNull(comments),
      acted_at: actedAt,
      updated_by: profile.userId,
    })
    .eq("leave_request_id", leaveRequestId)
    .eq("approver_employee_id", profile.employee.id)
    .eq("approval_status", "pending")
    .is("deleted_at", null)
    .select("id, approval_level")
    .maybeSingle();

  if (updateError) throw new Error(updateError.message);
  if (!updatedStep) {
    throw new Error("This approval step was already processed");
  }

  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "leave",
    action: "approve",
    description:
      updatedStep.approval_level === 1
        ? "Leave request approved by manager"
        : "Leave request approved by HR",
    recordId: leaveRequestId,
    metadata: { approvalLevel: updatedStep.approval_level },
  });

  await finalizeApprovalIfComplete(supabase, profile, leaveRequestId);

  const stillPending = await getPendingLeaveApproval(supabase, leaveRequestId);
  if (stillPending) {
    await dispatchLeaveApprovalEmails(leaveRequestId, profile.userId);
  }
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
    .select("id, employee_id, leave_type_id, start_date, total_days, leave_status")
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

  await assertCanActOnLeaveApproval(
    supabase,
    profile,
    leaveRequestId,
    request.employee_id,
    "reject",
  );

  const { data: approvalRow, error: approvalError } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .update({
      approval_status: "rejected",
      comments,
      acted_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("leave_request_id", leaveRequestId)
    .eq("approver_employee_id", profile.employee.id)
    .eq("approval_status", "pending")
    .is("deleted_at", null)
    .select("id, approval_level")
    .maybeSingle();

  if (approvalError) throw new Error(approvalError.message);
  if (!approvalRow) {
    await throwIfLeaveAlreadyProcessed(
      supabase,
      leaveRequestId,
      requiresCeoLeaveApproval(await getEmployeeRoleCodes(supabase, request.employee_id)),
    );
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
      { pending: -Number(request.total_days) },
    );
  }

  await notifyLeaveRejected(supabase, profile, leaveRequestId, request.employee_id);
  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "leave",
    action: "reject",
    description:
      approvalRow.approval_level === 1
        ? "Leave request rejected by manager"
        : "Leave request rejected by HR",
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

export async function cancelLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
): Promise<void> {
  const { data: request, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("id, employee_id, leave_type_id, start_date, total_days, leave_status")
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

  if (leaveType?.is_paid !== false) {
    if (previousStatus === "pending") {
      await adjustLeaveBalance(supabase, request.employee_id, request.leave_type_id, balanceYear, {
        pending: -totalDays,
      });
    } else if (previousStatus === "approved") {
      await adjustLeaveBalance(supabase, request.employee_id, request.leave_type_id, balanceYear, {
        used: -totalDays,
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
      "id, employee_id, leave_type_id, start_date, end_date, total_days, leave_status",
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
      excludeRequestId: leaveRequestId,
    },
  );
  const nextTotalDays = next.duration.totalLeaveDays;
  const previousTotalDays = Number(request.total_days);
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
      { pending: -previousTotalDays },
    );
  }

  try {
    if (next.leaveType.isPaid) {
      await ensureLeaveBalanceRow(
        supabase,
        input.employeeId,
        input.leaveTypeId,
        nextBalanceYear,
        Math.max(next.availableBalance ?? 0, nextTotalDays),
        profile.userId,
      );
      await adjustLeaveBalance(
        supabase,
        input.employeeId,
        input.leaveTypeId,
        nextBalanceYear,
        { pending: nextTotalDays },
      );
    }
  } catch (balanceError) {
    if (previousType?.is_paid !== false) {
      await adjustLeaveBalance(
        supabase,
        request.employee_id,
        request.leave_type_id,
        previousBalanceYear,
        { pending: previousTotalDays },
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
      duration_breakdown: next.duration,
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
        { pending: -nextTotalDays },
      );
    }
    if (previousType?.is_paid !== false) {
      await adjustLeaveBalance(
        supabase,
        request.employee_id,
        request.leave_type_id,
        previousBalanceYear,
        { pending: previousTotalDays },
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

