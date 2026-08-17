import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { AttendanceFormInput } from "@/lib/validations/attendance";
import { toUserFriendlyError } from "@/lib/errors/user-messages";
import {
  combineDateAndTime,
  computeWorkHours,
  validateAttendanceStatusConsistency,
} from "@/lib/attendance/services/attendance-utils";
import { getOrganizationAttendanceRules } from "@/lib/attendance/services/attendance-detail";
import {
  attendanceExistsForEmployeeDate,
  getEmployeeBranchId,
} from "@/lib/attendance/services/attendance-queries";
import { emitHrmsWebhook } from "@/lib/public-api/emit";

function emptyToNull(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function buildAttendancePayload(
  input: AttendanceFormInput,
  branchId: string,
  organizationId: string,
  userId: string,
) {
  const checkInAt = combineDateAndTime(input.attendanceDate, input.checkInAt);
  const checkOutAt = combineDateAndTime(input.attendanceDate, input.checkOutAt);
  const computedWorkHours = computeWorkHours(checkInAt, checkOutAt);
  const workHours =
    computedWorkHours;

  return {
    organization_id: organizationId,
    branch_id: branchId,
    employee_id: input.employeeId,
    attendance_date: input.attendanceDate,
    check_in_at: checkInAt,
    check_out_at: checkOutAt,
    attendance_status: input.attendanceStatus,
    work_hours: workHours,
    overtime_hours: input.overtimeHours ?? 0,
    notes: emptyToNull(input.notes),
    status: "active" as const,
    created_by: userId,
    updated_by: userId,
  };
}

async function assertAttendanceStatusValid(
  supabase: AuthSupabaseClient,
  organizationId: string,
  input: AttendanceFormInput,
) {
  const rules = await getOrganizationAttendanceRules(supabase, organizationId);
  const checkInAt = combineDateAndTime(input.attendanceDate, input.checkInAt);
  const checkOutAt = combineDateAndTime(input.attendanceDate, input.checkOutAt);
  const workHours = computeWorkHours(checkInAt, checkOutAt);
  const message = validateAttendanceStatusConsistency({
    attendanceStatus: input.attendanceStatus,
    attendanceDate: input.attendanceDate,
    checkInAt,
    checkOutAt,
    workHours,
    rules,
  });

  if (message) {
    throw new Error(message);
  }
}

export async function createAttendance(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: AttendanceFormInput,
): Promise<string> {
  const duplicate = await attendanceExistsForEmployeeDate(
    supabase,
    input.employeeId,
    input.attendanceDate,
  );

  if (duplicate) {
    throw new Error("Attendance already exists for this employee on the selected date");
  }

  await assertAttendanceStatusValid(
    supabase,
    profile.employee.organizationId,
    input,
  );

  const branchId = await getEmployeeBranchId(supabase, input.employeeId);
  const payload = buildAttendancePayload(
    input,
    branchId,
    profile.employee.organizationId,
    profile.userId,
  );

  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      throw new Error("Attendance already exists for this employee on the selected date");
    }
    throw new Error(error?.message ?? "Failed to create attendance");
  }

  emitHrmsWebhook(profile.employee.organizationId, "attendance.updated", {
    id: data.id,
    employeeId: input.employeeId,
    date: input.attendanceDate,
  });

  return data.id;
}

export async function updateAttendance(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  attendanceId: string,
  input: AttendanceFormInput,
): Promise<void> {
  const duplicate = await attendanceExistsForEmployeeDate(
    supabase,
    input.employeeId,
    input.attendanceDate,
    attendanceId,
  );

  if (duplicate) {
    throw new Error("Attendance already exists for this employee on the selected date");
  }

  await assertAttendanceStatusValid(
    supabase,
    profile.employee.organizationId,
    input,
  );

  const branchId = await getEmployeeBranchId(supabase, input.employeeId);
  const payload = buildAttendancePayload(
    input,
    branchId,
    profile.employee.organizationId,
    profile.userId,
  );

  const { error } = await supabase
    .schema("hrms")
    .from("attendance")
    .update({
      branch_id: payload.branch_id,
      employee_id: payload.employee_id,
      attendance_date: payload.attendance_date,
      check_in_at: payload.check_in_at,
      check_out_at: payload.check_out_at,
      attendance_status: payload.attendance_status,
      work_hours: payload.work_hours,
      overtime_hours: payload.overtime_hours,
      notes: payload.notes,
      updated_by: profile.userId,
    })
    .eq("id", attendanceId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Attendance already exists for this employee on the selected date");
    }
    throw new Error(error.message);
  }

  emitHrmsWebhook(profile.employee.organizationId, "attendance.updated", {
    id: attendanceId,
    employeeId: input.employeeId,
    date: input.attendanceDate,
  });
}

export async function softDeleteAttendance(
  supabase: AuthSupabaseClient,
  _profile: UserProfile,
  attendanceId: string,
): Promise<void> {
  const { data, error } = await supabase.schema("hrms").rpc("soft_delete_attendance", {
    p_attendance_id: attendanceId,
  });

  if (error) {
    throw new Error(toUserFriendlyError(error, "Failed to delete attendance"));
  }

  if (!data) {
    throw new Error("Attendance record not found or has already been deleted.");
  }
}
