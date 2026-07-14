import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { LeaveFormInput } from "@/lib/validations/leave";
import {
  calculateLeaveTotalDays,
  getCurrentBalanceYear,
} from "@/lib/leave/services/leave-utils";
import {
  getEmployeeReportingManagerId,
  getHrApproverEmployeeId,
} from "@/lib/leave/services/leave-queries";
import {
  notifyLeaveApproved,
  notifyLeaveCancelled,
  notifyLeaveManagerApproved,
  notifyLeaveRejected,
  notifyLeaveSubmitted,
} from "@/lib/leave/services/leave-notifications";

function emptyToNull(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
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
  const managerId = await getEmployeeReportingManagerId(supabase, employeeId);
  const hrId = await getHrApproverEmployeeId(supabase, organizationId);

  const steps: Array<{ level: number; approverId: string }> = [];

  if (managerId && managerId !== employeeId) {
    steps.push({ level: 1, approverId: managerId });
  }

  if (hrId && hrId !== employeeId && !steps.some((s) => s.approverId === hrId)) {
    steps.push({ level: steps.length + 1, approverId: hrId });
  }

  if (steps.length === 0) {
    steps.push({ level: 1, approverId: profile.employee.id });
  }

  const rows = steps.map((step) => ({
    leave_request_id: leaveRequestId,
    approver_employee_id: step.approverId,
    approval_level: step.level,
    approval_status: "pending" as const,
    status: "active" as const,
    created_by: profile.userId,
    updated_by: profile.userId,
  }));

  const { error } = await supabase.schema("hrms").from("leave_approvals").insert(rows);
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

  return data.id;
}

async function getPendingApprovalForActor(
  supabase: AuthSupabaseClient,
  leaveRequestId: string,
  actorEmployeeId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .select("id, approval_level, approval_status, approver_employee_id")
    .eq("leave_request_id", leaveRequestId)
    .eq("approver_employee_id", actorEmployeeId)
    .eq("approval_status", "pending")
    .is("deleted_at", null)
    .order("approval_level", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function canActorApproveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
): Promise<boolean> {
  const codes = profile.permissionCodes;
  const isHrOrAdmin =
    codes.includes("leave.approve") &&
    (codes.includes("leave_balance.manage") || profile.roles.some((r) =>
      ["hr_admin", "super_admin"].includes(r.code),
    ));

  if (isHrOrAdmin) {
    const pending = await getPendingApprovalForActor(
      supabase,
      leaveRequestId,
      profile.employee.id,
    );
    if (pending) return true;

    const { data } = await supabase
      .schema("hrms")
      .from("leave_approvals")
      .select("id")
      .eq("leave_request_id", leaveRequestId)
      .eq("approval_status", "pending")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    return Boolean(data);
  }

  const managerId = await getEmployeeReportingManagerId(supabase, employeeId);
  if (managerId !== profile.employee.id) return false;

  return Boolean(
    await getPendingApprovalForActor(supabase, leaveRequestId, profile.employee.id),
  );
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

  const allApproved = (approvals ?? []).every((a) => a.approval_status === "approved");
  const anyRejected = (approvals ?? []).some((a) => a.approval_status === "rejected");

  if (anyRejected) return;

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

  const canApprove = await canActorApproveRequest(
    supabase,
    profile,
    leaveRequestId,
    request.employee_id,
  );
  if (!canApprove) throw new Error("You are not authorized to approve this request");

  let approval = await getPendingApprovalForActor(
    supabase,
    leaveRequestId,
    profile.employee.id,
  );

  if (!approval) {
    const { data: anyPending } = await supabase
      .schema("hrms")
      .from("leave_approvals")
      .select("id, approval_level, approval_status, approver_employee_id")
      .eq("leave_request_id", leaveRequestId)
      .eq("approval_status", "pending")
      .is("deleted_at", null)
      .order("approval_level", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!anyPending) throw new Error("No pending approval step found");
    approval = anyPending;
  }

  const approvalId = approval.id;

  const { error: updateError } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .update({
      approval_status: "approved",
      comments: emptyToNull(comments),
      acted_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", approvalId);

  if (updateError) throw new Error(updateError.message);

  await finalizeApprovalIfComplete(supabase, profile, leaveRequestId);

  const { data: afterRequest, error: afterError } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("leave_status, employee_id")
    .eq("id", leaveRequestId)
    .single();

  if (afterError) throw new Error(afterError.message);

  if (afterRequest.leave_status === "pending") {
    await notifyLeaveManagerApproved(
      supabase,
      profile,
      leaveRequestId,
      afterRequest.employee_id,
    );
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
  if (request.leave_status !== "pending") {
    throw new Error("Only pending requests can be rejected");
  }

  const canApprove = await canActorApproveRequest(
    supabase,
    profile,
    leaveRequestId,
    request.employee_id,
  );
  if (!canApprove) throw new Error("You are not authorized to reject this request");

  const approval = await getPendingApprovalForActor(
    supabase,
    leaveRequestId,
    profile.employee.id,
  );

  if (approval) {
    await supabase
      .schema("hrms")
      .from("leave_approvals")
      .update({
        approval_status: "rejected",
        comments,
        acted_at: new Date().toISOString(),
        updated_by: profile.userId,
      })
      .eq("id", approval.id);
  }

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
