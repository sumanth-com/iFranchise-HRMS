import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { APPROVAL_LEVEL_LABELS } from "@/lib/leave/constants";
import { getLeaveRequestById } from "@/lib/leave/services/leave-detail";
import {
  detectTeamLeaveConflicts,
  getEmployeeLeaveBalanceSnapshot,
  resolveManagerLeaveWorkflowStatus,
} from "@/lib/manager/services/team-leave-queries";
import { assertTeamMember } from "@/lib/manager/services/team-queries";
import type { UserProfile } from "@/types/auth";
import type { TeamLeaveDetailBundle } from "@/types/manager-leave";

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getTeamLeaveDetailBundle(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  leaveRequestId: string,
): Promise<TeamLeaveDetailBundle | null> {
  const leave = await getLeaveRequestById(supabase, profile, leaveRequestId);
  if (!leave) return null;

  assertTeamMember(teamIds, leave.employeeId);

  const organizationId = profile.employee.organizationId;

  const { data: employeeRow, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        email,
        department_id,
        reporting_manager_id,
        designations:designation_id (title),
        managers:reporting_manager_id (first_name, last_name)
      `,
    )
    .eq("id", leave.employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);

  const designation = unwrap(employeeRow?.designations);
  const manager = unwrap(employeeRow?.managers);

  const teamMetaResult = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, department_id, reporting_manager_id, designations:designation_id (title)")
    .eq("organization_id", organizationId)
    .in("id", teamIds)
    .is("deleted_at", null);

  if (teamMetaResult.error) throw new Error(teamMetaResult.error.message);

  const managerCounts = new Map<string, number>();
  for (const row of teamMetaResult.data ?? []) {
    if (row.reporting_manager_id) {
      managerCounts.set(
        row.reporting_manager_id,
        (managerCounts.get(row.reporting_manager_id) ?? 0) + 1,
      );
    }
  }

  const teamMeta = (teamMetaResult.data ?? []).map((row) => {
    const rowDesignation = unwrap(row.designations);
    return {
      id: row.id,
      departmentId: row.department_id,
      designationTitle: rowDesignation?.title ?? null,
      hasDirectReports: (managerCounts.get(row.id) ?? 0) > 0,
    };
  });

  const { data: holidays, error: holidaysError } = await supabase
    .schema("hrms")
    .from("holidays")
    .select("name, holiday_date")
    .eq("organization_id", organizationId)
    .gte("holiday_date", leave.startDate)
    .lte("holiday_date", leave.endDate)
    .is("deleted_at", null);

  if (holidaysError) throw new Error(holidaysError.message);

  const conflicts = await detectTeamLeaveConflicts(
    supabase,
    organizationId,
    teamIds,
    {
      leaveRequestId: leave.id,
      employeeId: leave.employeeId,
      departmentId: employeeRow?.department_id ?? null,
      designationTitle: designation?.title ?? null,
      startDate: leave.startDate,
      endDate: leave.endDate,
    },
    teamMeta,
    (holidays ?? []).map((row) => ({
      name: row.name,
      holidayDate: row.holiday_date,
    })),
  );

  const balances = await getEmployeeLeaveBalanceSnapshot(
    supabase,
    leave.employeeId,
  );

  const workflowStatus = resolveManagerLeaveWorkflowStatus(
    leave.leaveStatus,
    leave.approvals.map((step) => ({
      approvalLevel: step.approvalLevel,
      approvalStatus: step.approvalStatus,
    })),
  );

  const managerPending =
    leave.leaveStatus === "pending" &&
    leave.approvals.some(
      (step) =>
        step.approvalLevel === 1 &&
        step.approvalStatus === "pending" &&
        step.approverEmployeeId === profile.employee.id,
    );

  const timeline = [
    {
      id: "applied",
      label: "Applied",
      status: "completed" as const,
      actorName: leave.employeeName,
      comments: leave.reason,
      actedAt: leave.appliedAt,
    },
    ...leave.approvals.map((step) => ({
      id: step.id,
      label: APPROVAL_LEVEL_LABELS[step.approvalLevel] ?? `Level ${step.approvalLevel}`,
      status:
        step.approvalStatus === "approved"
          ? ("completed" as const)
          : step.approvalStatus === "rejected"
            ? ("rejected" as const)
            : step.approvalStatus === "pending"
              ? ("pending" as const)
              : ("upcoming" as const),
      actorName: step.approverName,
      comments: step.comments,
      actedAt: step.actedAt,
    })),
  ];

  if (leave.leaveStatus === "approved") {
    timeline.push({
      id: "completed",
      label: "Completed",
      status: "completed",
      actorName: "System",
      comments: null,
      actedAt: leave.updatedAt,
    });
  }

  return {
    id: leave.id,
    employeeId: leave.employeeId,
    employeeCode: leave.employeeCode,
    employeeName: leave.employeeName,
    employeeEmail: employeeRow?.email ?? null,
    departmentName: leave.departmentName,
    designationTitle: designation?.title ?? null,
    managerName: manager ? `${manager.first_name} ${manager.last_name}` : null,
    leaveTypeId: leave.leaveTypeId,
    leaveTypeName: leave.leaveTypeName,
    leaveTypeCode: leave.leaveTypeCode,
    startDate: leave.startDate,
    endDate: leave.endDate,
    totalDays: leave.totalDays,
    isHalfDay: leave.isHalfDay,
    halfDayPeriod: leave.halfDayPeriod,
    reason: leave.reason,
    attachmentPath: leave.attachmentPath,
    leaveStatus: leave.leaveStatus,
    workflowStatus,
    appliedAt: leave.appliedAt,
    balances,
    conflicts,
    canApprove: leave.canApprove && managerPending,
    canReject: leave.canReject && managerPending,
    canRequestInfo: leave.leaveStatus === "pending" && managerPending,
    timeline,
  };
}
