import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  CeoRegularizationQueueItem,
  CeoRegularizationStatus,
} from "@/types/ceo-regularization";
import {
  executiveRequestCategoryLabel,
  getExecutiveRequestCategory,
} from "@/lib/approvals/executive-request-routing";
import { getEmployeeRoleCodes, isCeoLeaveApprover } from "@/lib/leave/services/leave-queries";
import { getMonthDateRange } from "@/lib/leave/services/leave-utils";

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type CorrectionRow = {
  id: string;
  employee_id: string;
  reason: string;
  correction_status: string;
  requested_check_in_at: string | null;
  requested_check_out_at: string | null;
  created_at: string;
  reviewed_at?: string | null;
  attendance:
    | { attendance_date: string }
    | { attendance_date: string }[]
    | null;
  employees:
    | {
        employee_code: string;
        first_name: string;
        last_name: string;
        organization_id: string;
        departments: { name: string } | { name: string }[] | null;
      }
    | Array<{
        employee_code: string;
        first_name: string;
        last_name: string;
        organization_id: string;
        departments: { name: string } | { name: string }[] | null;
      }>
    | null;
};

async function mapCorrectionRows(
  supabase: AuthSupabaseClient,
  rows: CorrectionRow[],
): Promise<CeoRegularizationQueueItem[]> {
  const roleCodesByEmployee = new Map<string, string[]>();
  const items: CeoRegularizationQueueItem[] = [];

  for (const row of rows) {
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
    const status = row.correction_status as CeoRegularizationStatus;

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
      correctionStatus: status === "approved" || status === "rejected" ? status : "pending",
      reviewedAt: row.reviewed_at ?? null,
    });
  }

  return items;
}

const CORRECTION_SELECT = `
  id,
  employee_id,
  reason,
  correction_status,
  requested_check_in_at,
  requested_check_out_at,
  created_at,
  reviewed_at,
  attendance:attendance_id (attendance_date),
  employees:employee_id!inner (
    employee_code,
    first_name,
    last_name,
    organization_id,
    departments:department_id (name)
  )
`;

export async function listCeoRegularizationApprovalQueue(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoRegularizationQueueItem[]> {
  if (!isCeoLeaveApprover(profile)) return [];

  const organizationId = profile.employee.organizationId;

  // CEO-routed rows set approver_employee_id (any active CEO). Do not require exact
  // assignee match — leave uses the same any-of CEO queue semantics.
  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance_corrections")
    .select(CORRECTION_SELECT)
    .not("approver_employee_id", "is", null)
    .eq("correction_status", "pending")
    .eq("employees.organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return mapCorrectionRows(supabase, (data ?? []) as CorrectionRow[]);
}

export async function listCeoProcessedRegularizations(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: { month?: number; year?: number } = {},
): Promise<CeoRegularizationQueueItem[]> {
  const organizationId = profile.employee.organizationId;
  const now = new Date();
  const month = filters.month ?? now.getMonth() + 1;
  const year = filters.year ?? now.getFullYear();
  const range = getMonthDateRange(month, year);

  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance_corrections")
    .select(CORRECTION_SELECT)
    .eq("reviewed_by", profile.userId)
    .in("correction_status", ["approved", "rejected"])
    .eq("employees.organization_id", organizationId)
    .is("deleted_at", null)
    .gte("reviewed_at", `${range.start}T00:00:00`)
    .lte("reviewed_at", `${range.end}T23:59:59.999`)
    .order("reviewed_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return mapCorrectionRows(supabase, (data ?? []) as CorrectionRow[]);
}
