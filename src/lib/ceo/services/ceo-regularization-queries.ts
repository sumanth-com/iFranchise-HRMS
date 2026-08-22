import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { CeoRegularizationQueueItem } from "@/types/ceo-regularization";
import {
  executiveRequestCategoryLabel,
  getExecutiveRequestCategory,
} from "@/lib/approvals/executive-request-routing";
import { getEmployeeRoleCodes } from "@/lib/leave/services/leave-queries";

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listCeoRegularizationApprovalQueue(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoRegularizationQueueItem[]> {
  const organizationId = profile.employee.organizationId;
  const ceoEmployeeId = profile.employee.id;

  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance_corrections")
    .select(
      `
        id,
        employee_id,
        reason,
        correction_status,
        requested_check_in_at,
        requested_check_out_at,
        created_at,
        attendance:attendance_id (attendance_date),
        employees:employee_id!inner (
          employee_code,
          first_name,
          last_name,
          organization_id,
          departments:department_id (name)
        )
      `,
    )
    .eq("approver_employee_id", ceoEmployeeId)
    .eq("correction_status", "pending")
    .eq("employees.organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const roleCodesByEmployee = new Map<string, string[]>();
  const items: CeoRegularizationQueueItem[] = [];

  for (const row of data ?? []) {
    const employee = unwrap(row.employees);
    if (!employee) continue;

    const attendance = unwrap(row.attendance);
    let roleCodes = roleCodesByEmployee.get(row.employee_id);
    if (!roleCodes) {
      roleCodes = await getEmployeeRoleCodes(supabase, row.employee_id);
      roleCodesByEmployee.set(row.employee_id, roleCodes);
    }
    const requestCategory = getExecutiveRequestCategory(roleCodes) ?? "hr";
    const department = unwrap(employee.departments ?? null);

    items.push({
      id: row.id,
      employeeId: row.employee_id,
      employeeCode: employee.employee_code ?? "",
      employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
      departmentName: department?.name ?? null,
      requestCategory,
      requestCategoryLabel: executiveRequestCategoryLabel(requestCategory),
      attendanceDate: attendance?.attendance_date ?? "",
      requestedCheckInAt: row.requested_check_in_at,
      requestedCheckOutAt: row.requested_check_out_at,
      reason: row.reason,
      submittedAt: row.created_at,
      correctionStatus: "pending",
    });
  }

  return items;
}
