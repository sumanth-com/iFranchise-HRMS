import { format, startOfMonth } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import {
  ExitRow,
  formatEmployeeName,
  fromHrms,
  isEmployeeOnly,
  isHrAdmin,
  isManagerRole,
  unwrapRelation,
} from "@/lib/exit/services/exit-utils";
import type { ExitListParams } from "@/lib/validations/exit";
import type {
  ExitAssetReturnItem,
  ExitClearanceItem,
  ExitInterviewItem,
  ExitListResult,
  ExitLookups,
  ExitResignationItem,
  ExitSettlementItem,
  ExitSummary,
  ExitTimelineItem,
} from "@/types/exit";

function mapClearance(row: ExitRow): ExitClearanceItem {
  return {
    id: row.id,
    resignationId: row.resignation_id,
    departmentKey: row.department_key,
    departmentLabel: row.department_label,
    clearanceStatus: row.clearance_status,
    remarks: row.remarks,
    actedAt: row.acted_at,
    sortOrder: row.sort_order ?? 0,
  };
}

function mapAssetReturn(row: ExitRow): ExitAssetReturnItem {
  return {
    id: row.id,
    resignationId: row.resignation_id,
    assetId: row.asset_id,
    assignmentId: row.assignment_id,
    assetCode: row.asset_code,
    assetName: row.asset_name,
    categoryName: row.category_name,
    returnStatus: row.return_status,
    conditionNotes: row.condition_notes,
    recoveryAmount: Number(row.recovery_amount ?? 0),
    returnedAt: row.returned_at,
  };
}

function mapSettlement(row: ExitRow): ExitSettlementItem {
  return {
    id: row.id,
    resignationId: row.resignation_id,
    employeeId: row.employee_id,
    pendingSalary: Number(row.pending_salary ?? 0),
    leaveEncashment: Number(row.leave_encashment ?? 0),
    bonus: Number(row.bonus ?? 0),
    reimbursements: Number(row.reimbursements ?? 0),
    deductions: Number(row.deductions ?? 0),
    assetDamageRecovery: Number(row.asset_damage_recovery ?? 0),
    netPayable: Number(row.net_payable ?? 0),
    leaveBalanceDays: Number(row.leave_balance_days ?? 0),
    settlementStatus: row.settlement_status,
    notes: row.notes,
    approvedAt: row.approved_at,
    paidAt: row.paid_at,
  };
}

function mapInterview(row: ExitRow): ExitInterviewItem {
  return {
    id: row.id,
    resignationId: row.resignation_id,
    employeeId: row.employee_id,
    reasonForLeaving: row.reason_for_leaving,
    managerRating: row.manager_rating,
    workEnvironmentRating: row.work_environment_rating,
    salarySatisfactionRating: row.salary_satisfaction_rating,
    growthOpportunitiesRating: row.growth_opportunities_rating,
    companyCultureRating: row.company_culture_rating,
    suggestions: row.suggestions,
    overallRating: row.overall_rating,
    hrPrivateNotes: row.hr_private_notes,
    conductedAt: row.conducted_at,
  };
}

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
    exitStatus: row.exit_status,
    managerEmployeeId: row.manager_employee_id,
    managerName: manager
      ? formatEmployeeName(manager.first_name, manager.last_name)
      : null,
    managerActedAt: row.manager_acted_at,
    managerRemarks: row.manager_remarks,
    hrActedAt: row.hr_acted_at,
    hrRemarks: row.hr_remarks,
    rejectedReason: row.rejected_reason,
    withdrawnAt: row.withdrawn_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

const RESIGNATION_SELECT = `
  id, employee_id, resignation_date, last_working_day, notice_period_days, reason, comments,
  exit_status, manager_employee_id, manager_acted_at, manager_remarks, hr_acted_at, hr_remarks,
  rejected_reason, withdrawn_at, completed_at, created_at,
  employees:employee_id(
    employee_code, first_name, last_name, department_id,
    departments:department_id(name),
    designations:designation_id(title)
  ),
  manager:manager_employee_id(first_name, last_name)
`;

export async function listResignations(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: ExitListParams,
): Promise<ExitListResult> {
  const organizationId = profile.employee.organizationId;
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = fromHrms(supabase, "exit_resignations")
    .select(RESIGNATION_SELECT, { count: "exact" })
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (isEmployeeOnly(profile)) {
    query = query.eq("employee_id", profile.employee.id);
  } else if (isManagerRole(profile) && !isHrAdmin(profile)) {
    query = query.or(
      `manager_employee_id.eq.${profile.employee.id},employee_id.eq.${profile.employee.id}`,
    );
  }

  if (params.employeeId) query = query.eq("employee_id", params.employeeId);
  if (params.exitStatus) query = query.eq("exit_status", params.exitStatus);
  if (params.departmentId) {
    query = query.eq("employees.department_id", params.departmentId);
  }
  if (params.search?.trim()) {
    query = query.ilike("reason", `%${params.search.trim()}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).map(mapResignation),
    total: count ?? 0,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getResignationById(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  resignationId: string,
): Promise<ExitResignationItem | null> {
  const { data, error } = await fromHrms(supabase, "exit_resignations")
    .select(RESIGNATION_SELECT)
    .eq("id", resignationId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const item = mapResignation(data);
  if (isEmployeeOnly(profile) && item.employeeId !== profile.employee.id) return null;

  const [clearance, assets, settlement, interview, timeline] = await Promise.all([
    fromHrms(supabase, "exit_clearance_items")
      .select("*")
      .eq("resignation_id", resignationId)
      .is("deleted_at", null)
      .order("sort_order"),
    fromHrms(supabase, "exit_asset_returns")
      .select("*")
      .eq("resignation_id", resignationId)
      .is("deleted_at", null)
      .order("asset_name"),
    fromHrms(supabase, "exit_settlements")
      .select("*")
      .eq("resignation_id", resignationId)
      .is("deleted_at", null)
      .maybeSingle(),
    fromHrms(supabase, "exit_interviews")
      .select("*")
      .eq("resignation_id", resignationId)
      .is("deleted_at", null)
      .maybeSingle(),
    fromHrms(supabase, "exit_timeline")
      .select("*")
      .eq("resignation_id", resignationId)
      .order("created_at", { ascending: false }),
  ]);

  if (clearance.error) throw new Error(clearance.error.message);
  if (assets.error) throw new Error(assets.error.message);
  if (settlement.error) throw new Error(settlement.error.message);
  if (interview.error) throw new Error(interview.error.message);
  if (timeline.error) throw new Error(timeline.error.message);

  return {
    ...item,
    clearance: (clearance.data ?? []).map(mapClearance),
    assets: (assets.data ?? []).map(mapAssetReturn),
    settlement: settlement.data ? mapSettlement(settlement.data) : null,
    interview: interview.data ? mapInterview(interview.data) : null,
    timeline: (timeline.data ?? []).map(
      (t: ExitRow): ExitTimelineItem => ({
        id: t.id,
        eventType: t.event_type,
        title: t.title,
        description: t.description,
        createdAt: t.created_at,
      }),
    ),
  };
}

export async function getExitSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<ExitSummary> {
  const list = await listResignations(supabase, profile, { page: 1, pageSize: 500 });
  const items = list.data;
  const today = new Date();
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const monthEnd = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd");

  const active = items.filter(
    (i) => !["completed", "rejected", "withdrawn"].includes(i.exitStatus),
  );

  const deptMap = new Map<string, number>();
  const reasonMap = new Map<string, number>();
  const monthMap = new Map<string, number>();

  for (const item of items) {
    const dept = item.departmentName ?? "Unassigned";
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
    reasonMap.set(item.reason, (reasonMap.get(item.reason) ?? 0) + 1);
    const month = item.resignationDate.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }

  const { data: assetPending } = await fromHrms(supabase, "exit_asset_returns")
    .select("id, resignation_id")
    .eq("organization_id", profile.employee.organizationId)
    .eq("return_status", "pending")
    .is("deleted_at", null);

  const { data: settlementPending } = await fromHrms(supabase, "exit_settlements")
    .select("id")
    .eq("organization_id", profile.employee.organizationId)
    .in("settlement_status", ["draft", "pending"])
    .is("deleted_at", null);

  const { data: recent } = await fromHrms(supabase, "exit_timeline")
    .select("*")
    .eq("organization_id", profile.employee.organizationId)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    pendingResignations: active.filter((i) =>
      ["submitted", "manager_approved"].includes(i.exitStatus),
    ).length,
    noticePeriod: active.filter((i) =>
      ["hr_approved", "clearance", "asset_return", "settlement", "interview", "documents"].includes(
        i.exitStatus,
      ),
    ).length,
    pendingClearance: active.filter((i) =>
      ["hr_approved", "clearance"].includes(i.exitStatus),
    ).length,
    assetsPendingReturn: assetPending?.length ?? 0,
    settlementsPending: settlementPending?.length ?? 0,
    leavingThisMonth: items.filter(
      (i) => i.lastWorkingDay >= monthStart && i.lastWorkingDay <= monthEnd,
    ).length,
    exitByDepartment: Array.from(deptMap.entries()).map(([departmentName, count]) => ({
      departmentName,
      count,
    })),
    monthlyAttrition: Array.from(monthMap.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .slice(-6)
      .map(([month, count]) => ({ month, count })),
    exitReasons: Array.from(reasonMap.entries()).map(([reason, count]) => ({ reason, count })),
    recentActivities: (recent ?? []).map((t: ExitRow) => ({
      id: t.id,
      eventType: t.event_type,
      title: t.title,
      description: t.description,
      createdAt: t.created_at,
    })),
  };
}

export async function getExitLookups(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<ExitLookups> {
  const organizationId = profile.employee.organizationId;
  let employeesQuery = fromHrms(supabase, "employees")
    .select("id, employee_code, first_name, last_name")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .in("employment_status", ["active", "probation", "on_leave"])
    .order("first_name")
    .limit(500);

  if (isEmployeeOnly(profile)) {
    employeesQuery = employeesQuery.eq("id", profile.employee.id);
  }

  const [employees, departments] = await Promise.all([
    employeesQuery,
    fromHrms(supabase, "departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (employees.error) throw new Error(employees.error.message);
  if (departments.error) throw new Error(departments.error.message);

  return {
    employees: (employees.data ?? []).map((e: ExitRow) => ({
      id: e.id,
      label: `${e.employee_code} — ${formatEmployeeName(e.first_name, e.last_name)}`,
    })),
    departments: (departments.data ?? []).map((d: ExitRow) => ({
      id: d.id,
      label: d.name,
    })),
  };
}

export async function listClearanceQueue(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
) {
  const resignations = await listResignations(supabase, profile, {
    page: 1,
    pageSize: 100,
  });
  const active = resignations.data.filter((r) =>
    ["hr_approved", "clearance", "asset_return", "settlement", "interview", "documents"].includes(
      r.exitStatus,
    ),
  );

  const details = await Promise.all(
    active.map((r) => getResignationById(supabase, profile, r.id)),
  );
  return details.filter(Boolean) as ExitResignationItem[];
}

export async function listExitDocuments(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  resignationId?: string,
) {
  let query = fromHrms(supabase, "document_letters")
    .select(
      `
      id, letter_number, letter_type, subject, letter_status, generated_at, published_at,
      source_record_id, employee_id,
      employees:employee_id(employee_code, first_name, last_name)
    `,
    )
    .eq("organization_id", profile.employee.organizationId)
    .eq("source_module", "exit")
    .is("deleted_at", null)
    .order("generated_at", { ascending: false })
    .limit(100);

  if (resignationId) {
    query = query.eq("source_record_id", resignationId);
  }

  if (isEmployeeOnly(profile)) {
    query = query.eq("employee_id", profile.employee.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: ExitRow) => {
    const employee = unwrapRelation(row.employees);
    return {
      id: row.id as string,
      letterNumber: (row.letter_number as string) ?? "—",
      letterType: row.letter_type as string,
      subject: (row.subject as string) ?? "—",
      letterStatus: row.letter_status as string,
      generatedAt: row.generated_at as string | null,
      publishedAt: row.published_at as string | null,
      resignationId: (row.source_record_id as string) ?? null,
      employeeId: row.employee_id as string,
      employeeName: formatEmployeeName(employee?.first_name, employee?.last_name),
      employeeCode: (employee?.employee_code as string) ?? "—",
    };
  });
}

/** Resignations eligible for document generation / review (includes completed). */
export async function listDocumentResignations(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
) {
  const resignations = await listResignations(supabase, profile, {
    page: 1,
    pageSize: 200,
  });
  return resignations.data.filter((r) =>
    ["documents", "interview", "completed", "settlement"].includes(r.exitStatus),
  );
}
