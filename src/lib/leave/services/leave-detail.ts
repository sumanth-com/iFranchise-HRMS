import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { LeaveDetail } from "@/types/leave";
import { requiresCeoLeaveApproval } from "@/lib/approvals/executive-request-routing";
import { isPendingHrReview, parseHrReviewMetadata } from "@/lib/leave/hr-review";
import { hasPermission } from "@/lib/permissions/utils";
import {
  canActorDecideLeaveRequest,
  getEmployeeRoleCodes,
  isCeoLeaveApprover,
  isHrLeaveActor,
} from "@/lib/leave/services/leave-queries";

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getLeaveRequestById(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
): Promise<LeaveDetail | null> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select(
      `
        id,
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        is_half_day,
        half_day_period,
        reason,
        emergency_contact_name,
        emergency_contact_phone,
        attachment_path,
        duration_breakdown,
        leave_status,
        created_at,
        updated_at,
        employees!inner (
          employee_code,
          first_name,
          last_name,
          organization_id,
          reporting_manager_id,
          departments:department_id (name),
          branches:branch_id (name),
          employment_types:employment_type_id (name)
        ),
        leave_types:leave_type_id (name, code),
        leave_approvals (
          id,
          approval_level,
          approval_status,
          approver_employee_id,
          comments,
          acted_at,
          acted_via,
          deleted_at,
          employees:approver_employee_id (first_name, last_name)
        )
      `,
    )
    .eq("id", leaveRequestId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const employee = unwrapRelation(data.employees);
  const leaveType = unwrapRelation(data.leave_types);
  const department = unwrapRelation(employee?.departments ?? null);
  const branch = unwrapRelation(employee?.branches ?? null);

  const rawApprovals = (data.leave_approvals ?? []).filter((row) => row.deleted_at == null);
  const approverIdsMissingName = rawApprovals
    .filter((row) => !unwrapRelation(row.employees))
    .map((row) => row.approver_employee_id)
    .filter(Boolean);

  const fallbackNamesById = new Map<string, string>();
  if (approverIdsMissingName.length > 0) {
    const { data: missingEmps } = await supabase
      .schema("hrms")
      .from("employees")
      .select("id, first_name, last_name")
      .in("id", Array.from(new Set(approverIdsMissingName)));

    for (const emp of missingEmps ?? []) {
      const name = `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim();
      if (name) {
        fallbackNamesById.set(emp.id, name);
      }
    }
  }

  const approvals = rawApprovals
    .map((row) => {
      const approver = unwrapRelation(row.employees);
      const nameFromJoin = approver ? `${approver.first_name} ${approver.last_name}`.trim() : "";
      const finalName = nameFromJoin || fallbackNamesById.get(row.approver_employee_id) || "";

      return {
        id: row.id,
        approvalLevel: row.approval_level,
        approverEmployeeId: row.approver_employee_id,
        approverName: finalName,
        approvalStatus: row.approval_status as LeaveDetail["approvals"][number]["approvalStatus"],
        comments: row.comments,
        actedAt: row.acted_at,
        actedVia: (row.acted_via === "email" ? "email" : "portal") as "portal" | "email",
      };
    })
    .sort((a, b) => a.approvalLevel - b.approvalLevel);

  const isHrOrAdmin = profile.roles.some((r) =>
    ["hr_admin", "hr_executive", "super_admin"].includes(r.code),
  );

  const pendingApproval = approvals
    .filter((step) => step.approvalStatus === "pending")
    .sort((a, b) => a.approvalLevel - b.approvalLevel)[0];
  const applicantRoles = await getEmployeeRoleCodes(supabase, data.employee_id);
  const executiveApplicant = requiresCeoLeaveApproval(applicantRoles);
  const hrReview = parseHrReviewMetadata(data.duration_breakdown);
  const pendingHrReview = isPendingHrReview(data.leave_status, data.duration_breakdown);

  const canApprove = pendingHrReview
    ? isHrLeaveActor(profile) || isCeoLeaveApprover(profile)
    : canActorDecideLeaveRequest({
        profile,
        applicantEmployeeId: data.employee_id,
        leaveStatus: data.leave_status,
        pendingLevel: pendingApproval?.approvalLevel ?? null,
        pendingApproverEmployeeId: pendingApproval?.approverEmployeeId ?? null,
        executiveApplicant,
      });
  const canReject = canApprove;

  const canCancel =
    ["pending", "approved"].includes(data.leave_status) &&
    (data.employee_id === profile.employee.id
      ? hasPermission(profile.permissionCodes, "leave.withdraw") ||
        hasPermission(profile.permissionCodes, "leave.cancel")
      : hasPermission(profile.permissionCodes, "leave.cancel"));

  const canEdit =
    data.leave_status === "pending" &&
    (hasPermission(profile.permissionCodes, "leave.edit") ||
      (data.employee_id === profile.employee.id &&
        hasPermission(profile.permissionCodes, "leave.create"))) &&
    (data.employee_id === profile.employee.id || isHrOrAdmin);

  const canDelete =
    hasPermission(profile.permissionCodes, "leave.delete") ||
    hasPermission(profile.permissionCodes, "leave.cancel") ||
    (data.employee_id === profile.employee.id &&
      data.leave_status === "pending" &&
      hasPermission(profile.permissionCodes, "leave.withdraw"));

  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeCode: employee?.employee_code ?? "",
    employeeName: employee ? `${employee.first_name} ${employee.last_name}` : "",
    departmentName: department?.name ?? null,
    branchName: branch?.name ?? null,
    leaveTypeId: data.leave_type_id,
    leaveTypeName: leaveType?.name ?? "",
    leaveTypeCode: leaveType?.code ?? "",
    startDate: data.start_date,
    endDate: data.end_date,
    totalDays: Number(data.total_days),
    durationBreakdown:
      data.duration_breakdown && typeof data.duration_breakdown === "object"
        ? (data.duration_breakdown as LeaveDetail["durationBreakdown"])
        : null,
    isHalfDay: data.is_half_day,
    halfDayPeriod:
      data.half_day_period === "morning" || data.half_day_period === "afternoon"
        ? data.half_day_period
        : null,
    reason: data.reason,
    emergencyContactName: data.emergency_contact_name,
    emergencyContactPhone: data.emergency_contact_phone,
    attachmentPath: data.attachment_path,
    leaveStatus: data.leave_status,
    appliedAt: data.created_at,
    updatedAt: data.updated_at,
    approvals,
    canApprove,
    canReject,
    canCancel,
    canEdit,
    canDelete,
    employmentTypeName: unwrapRelation(
      (employee as { employment_types?: { name: string } | { name: string }[] | null } | null)
        ?.employment_types ?? null,
    )?.name ?? null,
    hrReviewRequired: Boolean(hrReview?.required),
    hrReviewReason: hrReview?.reason ?? null,
    hrDecision: hrReview?.decision ?? null,
    hrRemarks: hrReview?.remarks ?? null,
    availableBalanceAtSubmit: hrReview?.availableBalanceAtSubmit ?? null,
  };
}
