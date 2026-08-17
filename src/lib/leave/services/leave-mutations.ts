import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { LeaveFormInput } from "@/lib/validations/leave";
import {
  calculateLeaveTotalDays,
  getCurrentBalanceYear,
} from "@/lib/leave/services/leave-utils";
import { getEmployeeReportingManagerId, getCeoApproverEmployeeId, getEmployeeRoleCodes, getHrApproverEmployeeId, isCeoLeaveApprover, isHrLeaveApplicant } from "@/lib/leave/services/leave-queries";
import {
  notifyLeaveApproved,
  notifyLeaveCancelled,
  notifyLeaveRejected,
  notifyLeaveSubmitted,
} from "@/lib/leave/services/leave-notifications";

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

  const { error } = await supabase
    .schema("hrms")
    .from("leave_balances")
    .update({
      pending_days: pendingDays,
      used_days: usedDays,
      balance_days: balanceDays,
      updated_at: new Date().toISOString(),
    })
    .eq("id", balance.id);

  if (error) throw new Error(error.message);
}

async function createApprovalSteps(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
) {
  const organizationId = profile.employee.organizationId;
  const applicantRoles = await getEmployeeRoleCodes(supabase, employeeId);
  const hrApplicant = isHrLeaveApplicant(applicantRoles);

  let approverId: string;
  if (hrApplicant) {
    const ceoId = await getCeoApproverEmployeeId(supabase, organizationId);
    if (!ceoId) {
      throw new Error("No CEO is configured to approve HR leave requests");
    }
    approverId = ceoId;
  } else {
    const hrId = await getHrApproverEmployeeId(supabase, organizationId);
    // HR-only approval chain — managers and executives do not approve leave.
    approverId =
      hrId && hrId !== employeeId ? hrId : hrId ?? profile.employee.id;
  }

  const { error } = await supabase.schema("hrms").from("leave_approvals").insert({
    leave_request_id: leaveRequestId,
    approver_employee_id: approverId,
    approval_level: 1,
    approval_status: "pending" as const,
    status: "active" as const,
    created_by: profile.userId,
    updated_by: profile.userId,
  });
  if (error) throw new Error(error.message);
}

export async function createLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: LeaveFormInput,
): Promise<string> {
  const totalDays = calculateLeaveTotalDays(
    input.startDate,
    input.endDate,
    input.isHalfDay,
  );
  const balanceYear = getCurrentBalanceYear(input.startDate);

  await adjustLeaveBalance(supabase, input.employeeId, input.leaveTypeId, balanceYear, {
    pending: totalDays,
  });

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
      leave_status: "pending",
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create leave request");
  }

  await createApprovalSteps(supabase, profile, data.id, input.employeeId);
  await notifyLeaveSubmitted(supabase, profile, data.id, input.employeeId);
  await dispatchLeaveApprovalEmails(data.id, profile.userId);

  return data.id;
}

function canApproveLeave(profile: UserProfile): boolean {
  // Manager/CEO leave.approve was revoked — anyone still holding this
  // permission is an HR/admin approver for org leave.
  return profile.permissionCodes.includes("leave.approve");
}

function canRejectLeave(profile: UserProfile): boolean {
  return profile.permissionCodes.includes("leave.reject");
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

async function assertCanActOnLeaveApproval(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
  action: "approve" | "reject",
): Promise<void> {
  const pendingApproval = await getPendingLeaveApproval(supabase, leaveRequestId);
  if (!pendingApproval) {
    throw new Error("No pending approval step for this request");
  }

  if (pendingApproval.approver_employee_id !== profile.employee.id) {
    throw new Error("You are not the assigned approver for this request");
  }

  const applicantRoles = await getEmployeeRoleCodes(supabase, employeeId);
  const hrApplicant = isHrLeaveApplicant(applicantRoles);

  if (hrApplicant) {
    if (!isCeoLeaveApprover(profile)) {
      throw new Error("Only the CEO can approve or reject HR leave requests");
    }
    return;
  }

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
    .select("employee_id, leave_type_id, start_date, total_days, leave_status")
    .eq("id", leaveRequestId)
    .single();

  if (requestError || !request) throw new Error(requestError?.message ?? "Not found");

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

  // No approval rows (legacy) or every step approved → finalize.
  const allApproved =
    rows.length === 0 || rows.every((a) => a.approval_status === "approved");
  if (!allApproved) return;

  const balanceYear = getCurrentBalanceYear(request.start_date);
  const totalDays = Number(request.total_days);

  await adjustLeaveBalance(
    supabase,
    request.employee_id,
    request.leave_type_id,
    balanceYear,
    { pending: -totalDays, used: totalDays },
  );

  const { error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .update({
      leave_status: "approved",
      updated_by: profile.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveRequestId);

  if (error) throw new Error(error.message);

  await notifyLeaveApproved(supabase, profile, leaveRequestId, request.employee_id);
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
    .select("id, employee_id, leave_status")
    .eq("id", leaveRequestId)
    .single();

  if (error || !request) throw new Error(error?.message ?? "Leave request not found");
  if (request.leave_status !== "pending") {
    throw new Error("Only pending requests can be approved");
  }

  await assertCanActOnLeaveApproval(
    supabase,
    profile,
    leaveRequestId,
    request.employee_id,
    "approve",
  );

  const actedAt = new Date().toISOString();
  const { error: updateError } = await supabase
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
    .is("deleted_at", null);

  if (updateError) throw new Error(updateError.message);

  // HR decision is final — approve even when older rows have no pending steps.
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
    .select("id, employee_id, leave_type_id, start_date, total_days, leave_status")
    .eq("id", leaveRequestId)
    .single();

  if (error || !request) throw new Error(error?.message ?? "Leave request not found");
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

  const { error: approvalError } = await supabase
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
    .is("deleted_at", null);

  if (approvalError) throw new Error(approvalError.message);

  const balanceYear = getCurrentBalanceYear(request.start_date);
  await adjustLeaveBalance(
    supabase,
    request.employee_id,
    request.leave_type_id,
    balanceYear,
    { pending: -Number(request.total_days) },
  );

  const { error: updateError } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .update({
      leave_status: "rejected",
      updated_by: profile.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveRequestId);

  if (updateError) throw new Error(updateError.message);

  await notifyLeaveRejected(supabase, profile, leaveRequestId, request.employee_id);
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

  const balanceYear = getCurrentBalanceYear(request.start_date);
  const totalDays = Number(request.total_days);

  if (request.leave_status === "pending") {
    await adjustLeaveBalance(supabase, request.employee_id, request.leave_type_id, balanceYear, {
      pending: -totalDays,
    });
  } else if (request.leave_status === "approved") {
    await adjustLeaveBalance(supabase, request.employee_id, request.leave_type_id, balanceYear, {
      used: -totalDays,
    });
  }

  const { error: updateError } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .update({
      leave_status: "cancelled",
      updated_by: profile.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveRequestId);

  if (updateError) throw new Error(updateError.message);

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

  const nextTotalDays = calculateLeaveTotalDays(
    input.startDate,
    input.endDate,
    input.isHalfDay,
  );
  const previousTotalDays = Number(request.total_days);
  const previousBalanceYear = getCurrentBalanceYear(request.start_date);
  const nextBalanceYear = getCurrentBalanceYear(input.startDate);

  // Release previous pending days, then apply the updated request.
  await adjustLeaveBalance(
    supabase,
    request.employee_id,
    request.leave_type_id,
    previousBalanceYear,
    { pending: -previousTotalDays },
  );

  try {
    await adjustLeaveBalance(
      supabase,
      input.employeeId,
      input.leaveTypeId,
      nextBalanceYear,
      { pending: nextTotalDays },
    );
  } catch (balanceError) {
    await adjustLeaveBalance(
      supabase,
      request.employee_id,
      request.leave_type_id,
      previousBalanceYear,
      { pending: previousTotalDays },
    );
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
      updated_by: profile.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveRequestId);

  if (updateError) {
    await adjustLeaveBalance(
      supabase,
      input.employeeId,
      input.leaveTypeId,
      nextBalanceYear,
      { pending: -nextTotalDays },
    );
    await adjustLeaveBalance(
      supabase,
      request.employee_id,
      request.leave_type_id,
      previousBalanceYear,
      { pending: previousTotalDays },
    );
    throw new Error(updateError.message);
  }
}

