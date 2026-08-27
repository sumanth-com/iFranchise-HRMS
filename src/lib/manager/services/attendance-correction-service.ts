import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { revalidateSelfAttendancePaths } from "@/lib/attendance/actions/self-attendance-punch-actions";
import {
  computeLateMinutes,
  computeWorkHours,
  getTodayDateString,
  OFFICE_CHECK_OUT_TIME,
} from "@/lib/attendance/services/attendance-utils";
import { getOrganizationAttendanceRules } from "@/lib/attendance/services/attendance-detail";
import {
  notifyAttendanceCorrectionApproved,
  notifyAttendanceCorrectionRejected,
} from "@/lib/attendance/services/attendance-notifications";
import { getEmployeeRoleCodes, isCeoLeaveApprover } from "@/lib/leave/services/leave-queries";
import { isHrLeaveApplicant } from "@/lib/leave/leave-applicant-roles";
import { isManagerLeaveApplicant } from "@/lib/approvals/executive-request-routing";
import { teamCorrectionReviewSchema } from "@/lib/validations/manager-team";
import type { UserProfile } from "@/types/auth";
import type { AttendanceStatus, AttendanceDisplayStatus } from "@/types/attendance";

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isWorkFromHomeBranch(branchName: string | null | undefined, notes: string | null | undefined) {
  const branch = branchName?.toLowerCase() ?? "";
  const note = notes?.toLowerCase() ?? "";
  return (
    branch.includes("remote") ||
    branch.includes("wfh") ||
    branch.includes("home") ||
    note.includes("wfh") ||
    note.includes("work from home")
  );
}

function computeMonitoringFlags(
  attendanceStatus: AttendanceDisplayStatus,
  checkInAt: string | null,
  checkOutAt: string | null,
  lateMinutes: number,
  attendanceDate: string,
): {
  isLate: boolean;
  isEarlyExit: boolean;
  missingCheckIn: boolean;
  missingCheckOut: boolean;
} {
  const missingCheckIn =
    !checkInAt &&
    (attendanceStatus === "absent" ||
      attendanceStatus === "late" ||
      attendanceStatus === "present" ||
      attendanceStatus === "half_day");

  const missingCheckOut = Boolean(checkInAt && !checkOutAt);

  let isEarlyExit = false;
  if (checkOutAt) {
    const [hours, minutes] = OFFICE_CHECK_OUT_TIME.split(":").map(Number);
    const threshold = new Date(`${attendanceDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`);
    isEarlyExit = new Date(checkOutAt).getTime() < threshold.getTime();
  }

  return {
    isLate: attendanceStatus === "late" || lateMinutes > 0,
    isEarlyExit,
    missingCheckIn,
    missingCheckOut,
  };
}

async function getDefaultBreakMinutes(
  supabase: AuthSupabaseClient,
  organizationId: string,
) {
  const { data } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  const settings = (data?.settings as Record<string, unknown> | null) ?? null;
  const lunchBreak = settings?.lunch_break as Record<string, unknown> | undefined;
  const duration = lunchBreak?.duration_minutes;
  return typeof duration === "number" ? duration : 60;
}

export async function reviewTeamAttendanceCorrection(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  input: unknown,
  decision: "approved" | "rejected",
) {
  return reviewAttendanceCorrection(supabase, profile, input, decision, {
    allowedEmployeeIds: teamIds,
  });
}

export async function reviewOrganizationAttendanceCorrection(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
  decision: "approved" | "rejected",
) {
  return reviewAttendanceCorrection(supabase, profile, input, decision, {
    organizationId: profile.employee.organizationId,
  });
}

export async function reviewCeoAttendanceCorrection(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
  decision: "approved" | "rejected",
) {
  if (!isCeoLeaveApprover(profile)) {
    throw new Error("Only the CEO can approve or reject this regularization request");
  }

  return reviewAttendanceCorrection(supabase, profile, input, decision, {
    organizationId: profile.employee.organizationId,
    requireAssignedCeo: true,
  });
}

async function reviewAttendanceCorrection(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
  decision: "approved" | "rejected",
  scope:
    | { allowedEmployeeIds: string[] }
    | { organizationId: string; requireAssignedCeo?: boolean },
) {
  const parsed = teamCorrectionReviewSchema.parse(input);

  const { data: correction, error: fetchError } = await supabase
    .schema("hrms")
    .from("attendance_corrections")
    .select(
      `
        id,
        employee_id,
        attendance_id,
        correction_status,
        approver_employee_id,
        requested_check_in_at,
        requested_check_out_at,
        attendance:attendance_id (attendance_date)
      `,
    )
    .eq("id", parsed.correctionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!correction) throw new Error("Correction request not found.");
  if (correction.correction_status !== "pending") {
    throw new Error("This correction has already been reviewed.");
  }

  // 1. Never allow the requester to approve their own request
  if (profile.employee.id === correction.employee_id) {
    throw new Error(
      "You cannot approve or reject your own attendance regularization request.",
    );
  }

  // 2. Enforce strict approval hierarchy based on applicant role:
  //    - Employee -> HR
  //    - Manager  -> CEO
  //    - HR       -> CEO
  const applicantRoles = await getEmployeeRoleCodes(supabase, correction.employee_id);
  const applicantIsHr = isHrLeaveApplicant(applicantRoles);
  const applicantIsManager = isManagerLeaveApplicant(applicantRoles);
  const reviewerRoles = profile.roles.map((r) => r.code);
  const reviewerIsHr = isHrLeaveApplicant(reviewerRoles);
  const reviewerIsCeo = isCeoLeaveApprover(profile);

  if (applicantIsHr || applicantIsManager || correction.approver_employee_id) {
    // HR or Manager applicant regularization: ANY CEO can approve or reject.
    if (!reviewerIsCeo) {
      throw new Error(
        "Only the CEO can approve or reject HR and Manager attendance regularization requests.",
      );
    }
  } else {
    // Employee applicant regularization: ONLY authorized HR users can approve or reject.
    if (!reviewerIsHr && !reviewerIsCeo) {
      throw new Error(
        "Only authorized HR users can approve or reject attendance regularization requests.",
      );
    }
  }

  if ("requireAssignedCeo" in scope && scope.requireAssignedCeo) {
    if (!reviewerIsCeo) {
      throw new Error("Only the CEO can review this regularization request.");
    }
  } else if ("allowedEmployeeIds" in scope) {
    if (!scope.allowedEmployeeIds.includes(correction.employee_id)) {
      throw new Error("You can only review corrections for your team.");
    }
  }

  const { data: employeeRow, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select("organization_id")
    .eq("id", correction.employee_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employeeRow || employeeRow.organization_id !== profile.employee.organizationId) {
    throw new Error("Correction request not found.");
  }

  const reviewedAt = new Date().toISOString();

  const { error: correctionError } = await supabase
    .schema("hrms")
    .from("attendance_corrections")
    .update({
      correction_status: decision,
      reviewed_by: profile.userId,
      reviewed_at: reviewedAt,
      review_notes: parsed.reviewNotes ?? null,
    })
    .eq("id", parsed.correctionId);

  if (correctionError) throw new Error(correctionError.message);

  const attendance = unwrap(correction.attendance);
  const attendanceDate = attendance?.attendance_date ?? getTodayDateString();

  if (decision === "approved") {
    const checkInAt = correction.requested_check_in_at;
    const checkOutAt = correction.requested_check_out_at;
    const workHours = computeWorkHours(checkInAt, checkOutAt);
    const rules = await getOrganizationAttendanceRules(
      supabase,
      profile.employee.organizationId,
    );
    const overtimeHours = Math.max(
      0,
      Math.round((workHours - rules.fullDayMinimumHours) * 100) / 100,
    );

    const { error: attendanceError } = await supabase
      .schema("hrms")
      .from("attendance")
      .update({
        check_in_at: checkInAt,
        check_out_at: checkOutAt,
        work_hours: workHours,
        overtime_hours: overtimeHours,
        attendance_status: "present",
        updated_by: profile.userId,
      })
      .eq("id", correction.attendance_id);

    if (attendanceError) throw new Error(attendanceError.message);

    await notifyAttendanceCorrectionApproved(
      supabase,
      profile,
      correction.employee_id,
      correction.id,
      attendanceDate,
    );
  } else {
    const { error: attendanceError } = await supabase
      .schema("hrms")
      .from("attendance")
      .update({
        attendance_status: "late",
        updated_by: profile.userId,
      })
      .eq("id", correction.attendance_id);

    if (attendanceError) throw new Error(attendanceError.message);

    await notifyAttendanceCorrectionRejected(
      supabase,
      profile,
      correction.employee_id,
      correction.id,
      attendanceDate,
    );
  }

  revalidateSelfAttendancePaths();

  return { success: true as const, message: `Regularization ${decision}.` };
}

export async function getTeamAttendanceDetailBundle(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  attendanceId: string,
) {
  const organizationId = profile.employee.organizationId;
  const rules = await getOrganizationAttendanceRules(supabase, organizationId);
  const breakMinutes = await getDefaultBreakMinutes(supabase, organizationId);

  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance")
    .select(
      `
        id,
        employee_id,
        attendance_date,
        check_in_at,
        check_out_at,
        work_hours,
        overtime_hours,
        attendance_status,
        notes,
        branches:branch_id (name),
        employees!inner (
          employee_code,
          first_name,
          last_name,
          email,
          department_id,
          designation_id,
          employment_type_id,
          departments:department_id (name),
          designations:designation_id (title),
          employment_types:employment_type_id (name)
        )
      `,
    )
    .eq("id", attendanceId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  if (!teamIds.includes(data.employee_id)) {
    throw new Error("You can only view attendance for your team.");
  }

  const employee = unwrap(data.employees);
  const branch = unwrap(data.branches);
  const department = unwrap(employee?.departments ?? null);
  const designation = unwrap(employee?.designations ?? null);
  const employmentType = unwrap(employee?.employment_types ?? null);
  const lateMinutes = computeLateMinutes(
    data.check_in_at,
    data.attendance_date,
    rules.lateAfter,
  );

  const [correctionResult, historyResult, auditResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("attendance_corrections")
      .select(
        "id, attendance_id, employee_id, reason, correction_status, requested_check_in_at, requested_check_out_at, review_notes, reviewed_at, created_at",
      )
      .eq("attendance_id", attendanceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .schema("hrms")
      .from("attendance")
      .select("id, attendance_date, check_in_at, check_out_at, work_hours, attendance_status")
      .eq("employee_id", data.employee_id)
      .is("deleted_at", null)
      .order("attendance_date", { ascending: false })
      .limit(7),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("device_type, ip_address, browser, operating_system")
      .eq("record_id", attendanceId)
      .eq("module", "attendance")
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (correctionResult.error) throw new Error(correctionResult.error.message);
  if (historyResult.error) throw new Error(historyResult.error.message);

  const correctionRow = correctionResult.data;
  const auditRow = auditResult.data;

  const locationLabel = auditRow?.ip_address
    ? `IP ${auditRow.ip_address}`
    : null;
  const deviceLabel =
    auditRow?.device_type ??
    auditRow?.browser ??
    auditRow?.operating_system ??
    null;

  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeCode: employee?.employee_code ?? "",
    employeeName: employee ? `${employee.first_name} ${employee.last_name}` : "",
    employeeEmail: employee?.email ?? null,
    departmentName: department?.name ?? null,
    designationTitle: designation?.title ?? null,
    employmentTypeName: employmentType?.name ?? null,
    branchName: branch?.name ?? null,
    attendanceDate: data.attendance_date,
    checkInAt: data.check_in_at,
    checkOutAt: data.check_out_at,
    workHours: Number(data.work_hours ?? 0),
    breakMinutes,
    overtimeHours: Number(data.overtime_hours ?? 0),
    attendanceStatus: data.attendance_status as AttendanceStatus,
    lateMinutes,
    notes: data.notes,
    locationLabel,
    deviceLabel,
    correction: correctionRow
      ? {
          id: correctionRow.id,
          attendanceId: correctionRow.attendance_id,
          employeeId: correctionRow.employee_id,
          reason: correctionRow.reason,
          correctionStatus: correctionRow.correction_status,
          requestedCheckInAt: correctionRow.requested_check_in_at,
          requestedCheckOutAt: correctionRow.requested_check_out_at,
          reviewNotes: correctionRow.review_notes,
          reviewedAt: correctionRow.reviewed_at,
          createdAt: correctionRow.created_at,
        }
      : null,
    history: (historyResult.data ?? []).map((row) => ({
      id: row.id,
      attendanceDate: row.attendance_date,
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
      workHours: Number(row.work_hours ?? 0),
      attendanceStatus: row.attendance_status as AttendanceStatus,
    })),
    monitoring: computeMonitoringFlags(
      data.attendance_status as AttendanceStatus,
      data.check_in_at,
      data.check_out_at,
      lateMinutes,
      data.attendance_date,
    ),
  };
}

export {
  isWorkFromHomeBranch,
  computeMonitoringFlags,
  getDefaultBreakMinutes,
};
