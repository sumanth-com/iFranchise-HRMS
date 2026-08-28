import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getMonthDateRange } from "@/lib/leave/services/leave-utils";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
  type ExitRow,
} from "@/lib/exit/services/exit-utils";
import type { UserProfile } from "@/types/auth";
import type { ExitResignationItem, ExitStatus } from "@/types/exit";

function mapResignation(row: ExitRow): ExitResignationItem {
  const employee = unwrapRelation(row.employees);
  const dept = unwrapRelation(employee?.departments ?? null);
  const desig = unwrapRelation(employee?.designations ?? null);
  const manager = unwrapRelation(row.manager);

  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: employee?.employee_code ?? "—",
    employeeName: formatEmployeeName(employee?.first_name, employee?.last_name),
    departmentName: dept?.name ?? null,
    designationTitle: desig?.title ?? null,
    resignationDate: row.resignation_date,
    lastWorkingDay: row.last_working_day,
    noticePeriodDays: row.notice_period_days,
    reason: row.reason,
    comments: row.comments,
    exitStatus: row.exit_status as ExitStatus,
    managerEmployeeId: row.manager_employee_id,
    managerName: manager
      ? formatEmployeeName(manager.first_name, manager.last_name)
      : null,
    managerActedAt: row.manager_acted_at,
    managerRemarks: row.manager_remarks,
    hrActedAt: row.hr_acted_at,
    hrRemarks: row.hr_remarks,
    ceoActedAt: row.ceo_acted_at,
    ceoRemarks: row.ceo_remarks,
    rejectedReason: row.rejected_reason,
    withdrawnAt: row.withdrawn_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

const RESIGNATION_SELECT = `
  id, employee_id, resignation_date, last_working_day, notice_period_days, reason, comments,
  exit_status, manager_employee_id, manager_acted_at, manager_remarks, hr_acted_at, hr_remarks,
  ceo_acted_at, ceo_remarks,
  rejected_reason, withdrawn_at, completed_at, created_at,
  employees:employee_id(
    employee_code, first_name, last_name, department_id,
    departments:department_id(name),
    designations:designation_id(title)
  ),
  manager:manager_employee_id(first_name, last_name)
`;

export async function listCeoExitApprovalQueue(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<ExitResignationItem[]> {
  const { data, error } = await fromHrms(supabase, "exit_resignations")
    .select(RESIGNATION_SELECT)
    .eq("organization_id", profile.employee.organizationId)
    .in("exit_status", ["submitted", "manager_approved", "hr_approved"])
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapResignation);
}

export async function listCeoProcessedExitApprovals(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: { month?: number; year?: number } = {},
): Promise<ExitResignationItem[]> {
  const now = new Date();
  const month = filters.month ?? now.getMonth() + 1;
  const year = filters.year ?? now.getFullYear();
  const range = getMonthDateRange(month, year);

  const { data, error } = await fromHrms(supabase, "exit_resignations")
    .select(RESIGNATION_SELECT)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .not("ceo_acted_at", "is", null)
    .gte("ceo_acted_at", `${range.start}T00:00:00`)
    .lte("ceo_acted_at", `${range.end}T23:59:59.999`)
    .order("ceo_acted_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapResignation);
}
