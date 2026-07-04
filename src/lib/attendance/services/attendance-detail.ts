import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { AttendanceDetail, AttendanceStatus } from "@/types/attendance";
import {
  computeLateMinutes,
  parseAttendanceRules,
} from "@/lib/attendance/services/attendance-utils";

type AttendanceDetailRow = {
  id: string;
  organization_id: string;
  branch_id: string;
  employee_id: string;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  attendance_status: AttendanceStatus;
  work_hours: number | string;
  overtime_hours: number | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  branches: { name: string } | { name: string }[] | null;
  employees:
    | {
        employee_code: string;
        first_name: string;
        last_name: string;
        email: string;
        department_id: string | null;
        designation_id: string | null;
        departments: { name: string } | { name: string }[] | null;
        designations: { title: string } | { title: string }[] | null;
      }
    | {
        employee_code: string;
        first_name: string;
        last_name: string;
        email: string;
        department_id: string | null;
        designation_id: string | null;
        departments: { name: string } | { name: string }[] | null;
        designations: { title: string } | { title: string }[] | null;
      }[]
    | null;
};

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function getOrganizationAttendanceRules(
  supabase: AuthSupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return parseAttendanceRules(
    (data?.settings as Record<string, unknown> | null) ?? null,
  );
}

async function resolveAuditActor(
  supabase: AuthSupabaseClient,
  organizationId: string,
  userId: string | null,
) {
  if (!userId) return null;

  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select("first_name, last_name")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    userId,
    employeeName: data ? `${data.first_name} ${data.last_name}` : null,
  };
}

export async function getAttendanceById(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  attendanceId: string,
): Promise<AttendanceDetail | null> {
  const organizationId = profile.employee.organizationId;

  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance")
    .select(
      `
        id,
        organization_id,
        branch_id,
        employee_id,
        attendance_date,
        check_in_at,
        check_out_at,
        attendance_status,
        work_hours,
        overtime_hours,
        notes,
        created_at,
        updated_at,
        created_by,
        updated_by,
        branches:branch_id (name),
        employees!inner (
          employee_code,
          first_name,
          last_name,
          email,
          department_id,
          designation_id,
          departments:department_id (name),
          designations:designation_id (title)
        )
      `,
    )
    .eq("id", attendanceId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const row = data as AttendanceDetailRow;
  const employee = unwrapRelation(row.employees);
  const branch = unwrapRelation(row.branches);
  const department = unwrapRelation(employee?.departments ?? null);
  const designation = unwrapRelation(employee?.designations ?? null);
  const rules = await getOrganizationAttendanceRules(supabase, organizationId);

  const [createdBy, updatedBy] = await Promise.all([
    resolveAuditActor(supabase, organizationId, row.created_by),
    resolveAuditActor(supabase, organizationId, row.updated_by),
  ]);

  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    branchName: branch?.name ?? null,
    employeeId: row.employee_id,
    employeeCode: employee?.employee_code ?? "",
    employeeName: employee ? `${employee.first_name} ${employee.last_name}` : "",
    employeeEmail: employee?.email ?? null,
    departmentId: employee?.department_id ?? null,
    departmentName: department?.name ?? null,
    designationId: employee?.designation_id ?? null,
    designationTitle: designation?.title ?? null,
    attendanceDate: row.attendance_date,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    attendanceStatus: row.attendance_status,
    workHours: Number(row.work_hours ?? 0),
    overtimeHours: Number(row.overtime_hours ?? 0),
    lateMinutes: computeLateMinutes(
      row.check_in_at,
      row.attendance_date,
      rules.lateAfter,
    ),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy,
    updatedBy,
  };
}

export { getOrganizationAttendanceRules };
