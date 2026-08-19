import { format, startOfMonth, subMonths } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { absentTodayIncludingLeave } from "@/lib/attendance/attendance-presence";
import { getAttendanceSummary } from "@/lib/attendance/services/attendance-queries";
import { getAssetsReports, getAssetsSummary } from "@/lib/assets/services/asset-queries";
import { getExitSummary } from "@/lib/exit/services/exit-queries";
import { getLeaveSummary } from "@/lib/leave/services/leave-queries";
import { getPayrollSummary } from "@/lib/payroll/services/payroll-queries";
import { getPerformanceSummary } from "@/lib/performance/services/performance-queries";
import {
  getHiringAnalytics,
  getRecruitmentSummary,
} from "@/lib/recruitment/services/recruitment-queries";
import { REPORT_KEY_LABELS } from "@/lib/reports/constants";
import { resolveTeamEmployeeIds } from "@/lib/manager/portal-scope";
import { getManagerReportsLookups } from "@/lib/manager/services/team-reports-queries";
import {
  buildResult,
  defaultDateRange,
  formatEmployeeName,
  fromHrms,
  monthKey,
  type ReportRowLoose,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import type { UserProfile } from "@/types/auth";
import type {
  ExecutiveDashboard,
  ReportFilters,
  ReportKey,
  ReportResult,
  ReportsLookups,
} from "@/types/reports";

function resolveDates(filters: ReportFilters, fallbackDays = 30) {
  const fallback = defaultDateRange(fallbackDays);
  return {
    dateFrom: filters.dateFrom || fallback.dateFrom,
    dateTo: filters.dateTo || fallback.dateTo,
  };
}

type EmployeeReportRow = {
  employeeCode: string;
  employeeName: string;
  email: string;
  employmentStatus: string;
  dateOfJoining: string;
  dateOfLeaving: string;
  department: string;
  designation: string;
  departmentId: string | null;
  designationId: string | null;
};

function mapEmployeeRow(row: ReportRowLoose): EmployeeReportRow {
  const dept = unwrapRelation(row.departments);
  const desig = unwrapRelation(row.designations);
  return {
    employeeCode: row.employee_code ?? "—",
    employeeName: formatEmployeeName(row.first_name, row.last_name),
    email: row.email ?? "",
    employmentStatus: row.employment_status ?? "",
    dateOfJoining: row.date_of_joining ?? "",
    dateOfLeaving: row.date_of_leaving ?? "",
    department: dept?.name ?? "—",
    designation: desig?.title ?? "—",
    departmentId: row.department_id ?? null,
    designationId: row.designation_id ?? null,
  };
}

async function fetchEmployees(
  supabase: AuthSupabaseClient,
  organizationId: string,
  filters: ReportFilters,
): Promise<EmployeeReportRow[]> {
  let query = fromHrms(supabase, "employees")
    .select(
      `
      id, employee_code, first_name, last_name, email, employment_status,
      date_of_joining, date_of_leaving, department_id, designation_id,
      departments:department_id(name),
      designations:designation_id(title)
    `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("employee_code")
    .limit(2000);

  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.designationId) query = query.eq("designation_id", filters.designationId);
  if (filters.employeeId) query = query.eq("id", filters.employeeId);
  if (filters.teamEmployeeIds?.length) query = query.in("id", filters.teamEmployeeIds);
  if (filters.status) query = query.eq("employment_status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEmployeeRow);
}

const EXECUTIVE_ROLE_CODES = new Set(["ceo", "founder", "co_founder"]);
const EXECUTIVE_DESIGNATION_CODES = new Set([
  "CEO",
  "CO_FOUNDER",
  "COFOUNDER",
  "CHIEF_EXECUTIVE_OFFICER",
  "FOUNDER",
]);

function isExecutiveLeadershipEmployee(row: ReportRowLoose) {
  const designation = unwrapRelation(row.designations);
  const title = String(designation?.title ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
  const code = String(designation?.code ?? "")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (EXECUTIVE_DESIGNATION_CODES.has(code)) return true;

  return (
    title === "ceo" ||
    title.includes("chief executive") ||
    title.includes("co founder") ||
    title.includes("cofounder") ||
    title === "founder"
  );
}

export async function getReportsLookups(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<ReportsLookups> {
  const organizationId = profile.employee.organizationId;
  const teamIds = await resolveTeamEmployeeIds(supabase, profile);
  if (teamIds) {
    return getManagerReportsLookups(supabase, organizationId, teamIds);
  }
  const [departments, designations, employees, executiveRoles, leaveTypes] = await Promise.all([
    fromHrms(supabase, "departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "designations")
      .select("id, title")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("title"),
    fromHrms(supabase, "employees")
      .select(
        "id, employee_code, first_name, last_name, user_id, designations:designation_id(title, code)",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("employment_status", ["active", "probation", "on_leave"])
      .order("first_name")
      .limit(500),
    fromHrms(supabase, "user_roles")
      .select("employee_id, user_id, roles:role_id(code)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "leave_types")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (departments.error) throw new Error(departments.error.message);
  if (designations.error) throw new Error(designations.error.message);
  if (employees.error) throw new Error(employees.error.message);
  if (leaveTypes.error) throw new Error(leaveTypes.error.message);

  const executiveEmployeeIds = new Set<string>();
  const executiveUserIds = new Set<string>();
  for (const row of (executiveRoles.data ?? []) as ReportRowLoose[]) {
    const role = unwrapRelation(row.roles);
    if (!EXECUTIVE_ROLE_CODES.has(String(role?.code ?? "").toLowerCase())) continue;
    if (row.employee_id) executiveEmployeeIds.add(String(row.employee_id));
    if (row.user_id) executiveUserIds.add(String(row.user_id));
  }

  return {
    departments: (departments.data ?? []).map((d: ReportRowLoose) => ({
      id: d.id,
      label: d.name,
    })),
    designations: (designations.data ?? []).map((d: ReportRowLoose) => ({
      id: d.id,
      label: d.title,
    })),
    employees: ((employees.data ?? []) as ReportRowLoose[])
      .filter((row) => {
        if (executiveEmployeeIds.has(String(row.id))) return false;
        if (row.user_id && executiveUserIds.has(String(row.user_id))) return false;
        return !isExecutiveLeadershipEmployee(row);
      })
      .map((e) => ({
        id: e.id,
        label: `${e.employee_code} — ${formatEmployeeName(e.first_name, e.last_name)}`,
      })),
    leaveTypes: (leaveTypes.data ?? []).map((row: ReportRowLoose) => ({
      id: row.id,
      label: row.name,
    })),
  };
}

export async function getExecutiveDashboard(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<ExecutiveDashboard> {
  const organizationId = profile.employee.organizationId;
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd");
  const yearAgo = format(subMonths(now, 11), "yyyy-MM-01");

  const [
    employees,
    attendance,
    leave,
    payroll,
    performance,
    recruitment,
    hiring,
    assets,
    assetReports,
    exitSummary,
    joiners,
    leavers,
    attendanceRows,
    leaveApproved,
  ] = await Promise.all([
    fromHrms(supabase, "employees")
      .select(
        "id, employment_status, date_of_joining, date_of_leaving, department_id, departments:department_id(name)",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .limit(5000),
    getAttendanceSummary(supabase, profile),
    getLeaveSummary(supabase, profile),
    getPayrollSummary(supabase, profile),
    getPerformanceSummary(supabase, profile),
    getRecruitmentSummary(supabase, profile),
    getHiringAnalytics(supabase, profile),
    getAssetsSummary(supabase, profile),
    getAssetsReports(supabase, profile),
    getExitSummary(supabase, profile),
    fromHrms(supabase, "employees")
      .select("id, date_of_joining")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("date_of_joining", monthStart)
      .lte("date_of_joining", monthEnd),
    fromHrms(supabase, "employees")
      .select("id, date_of_leaving, employment_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("employment_status", ["resigned", "terminated"])
      .gte("date_of_leaving", monthStart)
      .lte("date_of_leaving", monthEnd),
    fromHrms(supabase, "attendance")
      .select("attendance_date, attendance_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("attendance_date", format(subMonths(now, 5), "yyyy-MM-01"))
      .order("attendance_date"),
    fromHrms(supabase, "leave_requests")
      .select("start_date, total_days, leave_status")
      .eq("organization_id", organizationId)
      .eq("leave_status", "approved")
      .is("deleted_at", null)
      .gte("start_date", yearAgo),
  ]);

  if (employees.error) throw new Error(employees.error.message);

  const empRows = (employees.data ?? []) as ReportRowLoose[];
  const activeStatuses = new Set(["active", "probation", "on_leave"]);
  const totalEmployees = empRows.filter((e) => activeStatuses.has(e.employment_status)).length;

  const growthMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const key = format(subMonths(now, i), "yyyy-MM");
    growthMap.set(key, 0);
  }
  for (const e of empRows) {
    if (!e.date_of_joining) continue;
    const key = e.date_of_joining.slice(0, 7);
    if (growthMap.has(key)) growthMap.set(key, (growthMap.get(key) ?? 0) + 1);
  }

  const deptMap = new Map<string, number>();
  for (const e of empRows) {
    if (!activeStatuses.has(e.employment_status)) continue;
    const dept = unwrapRelation(e.departments)?.name ?? "Unassigned";
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
  }

  const attendanceTrendMap = new Map<string, number>();
  for (const row of (attendanceRows.data ?? []) as ReportRowLoose[]) {
    if (!["present", "late", "half_day"].includes(row.attendance_status)) continue;
    const key = String(row.attendance_date).slice(0, 7);
    attendanceTrendMap.set(key, (attendanceTrendMap.get(key) ?? 0) + 1);
  }

  const leaveTrendMap = new Map<string, number>();
  for (const row of (leaveApproved.data ?? []) as ReportRowLoose[]) {
    const key = String(row.start_date).slice(0, 7);
    leaveTrendMap.set(key, (leaveTrendMap.get(key) ?? 0) + Number(row.total_days ?? 0));
  }

  const ratingBuckets = [
    { label: "1", value: 0 },
    { label: "2", value: 0 },
    { label: "3", value: 0 },
    { label: "4", value: 0 },
    { label: "5", value: 0 },
  ];
  // Approximate distribution from average + reviews count via performance summary reviews
  // Use review status labels if rating distribution unavailable — still live via reviews list below
  const { data: reviewRatings } = await fromHrms(supabase, "performance_reviews")
    .select("overall_rating")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .not("overall_rating", "is", null)
    .limit(2000);
  for (const r of (reviewRatings ?? []) as ReportRowLoose[]) {
    const rating = Math.round(Number(r.overall_rating));
    const bucket = ratingBuckets.find((b) => b.label === String(rating));
    if (bucket) bucket.value += 1;
  }

  return {
    cards: {
      totalEmployees,
      newHires: joiners.data?.length ?? 0,
      employeesLeft: leavers.data?.length ?? 0,
      attendanceToday: attendance.presentToday + attendance.lateToday + attendance.halfDayToday,
      employeesOnLeave: absentTodayIncludingLeave(attendance),
      payrollCost: payroll.netPayroll || payroll.grossPayroll || 0,
      averagePerformanceRating: performance.averageRating ?? 0,
      openRecruitments: recruitment.openPositions ?? 0,
      assetsAssigned: assets.assignedAssets ?? 0,
      pendingExitClearance: exitSummary.pendingClearance ?? 0,
    },
    charts: {
      employeeGrowth: Array.from(growthMap.entries()).map(([label, value]) => ({ label, value })),
      hiringTrend: hiring.monthlyOutcomes.map((m) => ({ label: m.month, value: m.hired })),
      attritionTrend: exitSummary.monthlyAttrition.map((m) => ({
        label: m.month,
        value: m.count,
      })),
      attendanceTrend: Array.from(attendanceTrendMap.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([label, value]) => ({ label, value })),
      leaveTrend: Array.from(leaveTrendMap.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([label, value]) => ({ label, value })),
      payrollCostTrend: payroll.monthlyOverview.map((m) => ({
        label: m.label,
        value: m.net,
      })),
      departmentDistribution: Array.from(deptMap.entries()).map(([label, value]) => ({
        label,
        value,
      })),
      performanceDistribution: ratingBuckets,
      recruitmentFunnel: hiring.pipeline.map((f) => ({
        label: f.stage,
        value: f.count,
      })),
      assetAllocation: [
        { label: "Available", value: assetReports.utilization.available },
        { label: "Assigned", value: assetReports.utilization.assigned },
        { label: "Maintenance", value: assetReports.utilization.maintenance },
        { label: "Other", value: assetReports.utilization.other },
      ],
    },
  };
}

function isActiveDuringPeriod(
  employee: EmployeeReportRow,
  dateFrom: string,
  dateTo: string,
) {
  const joinedOk = !employee.dateOfJoining || employee.dateOfJoining <= dateTo;
  const leftOk = !employee.dateOfLeaving || employee.dateOfLeaving >= dateFrom;
  return joinedOk && leftOk;
}

async function runHrReport(
  supabase: AuthSupabaseClient,
  organizationId: string,
  key: ReportKey,
  filters: ReportFilters,
): Promise<ReportResult> {
  const employees = await fetchEmployees(supabase, organizationId, filters);
  const { dateFrom, dateTo } = resolveDates(filters);
  const title = REPORT_KEY_LABELS[key];
  const periodEmployees = employees.filter((employee) =>
    isActiveDuringPeriod(employee, dateFrom, dateTo),
  );

  if (key === "hr_employee_master") {
    return buildResult(
      key,
      title,
      [
        { key: "employeeCode", header: "Code" },
        { key: "employeeName", header: "Name" },
        { key: "email", header: "Email" },
        { key: "department", header: "Department" },
        { key: "designation", header: "Designation" },
        { key: "dateOfJoining", header: "Joined" },
      ],
      periodEmployees,
    );
  }

  if (key === "hr_department") {
    const map = new Map<string, number>();
    for (const e of periodEmployees.filter((x) =>
      ["active", "probation", "on_leave"].includes(x.employmentStatus),
    )) {
      map.set(e.department, (map.get(e.department) ?? 0) + 1);
    }
    return buildResult(
      key,
      title,
      [
        { key: "department", header: "Department" },
        { key: "headcount", header: "Headcount" },
      ],
      Array.from(map.entries()).map(([department, headcount]) => ({ department, headcount })),
    );
  }

  if (key === "hr_designation") {
    const map = new Map<string, number>();
    for (const e of periodEmployees.filter((x) =>
      ["active", "probation", "on_leave"].includes(x.employmentStatus),
    )) {
      map.set(e.designation, (map.get(e.designation) ?? 0) + 1);
    }
    return buildResult(
      key,
      title,
      [
        { key: "designation", header: "Designation" },
        { key: "headcount", header: "Headcount" },
      ],
      Array.from(map.entries()).map(([designation, headcount]) => ({ designation, headcount })),
    );
  }

  if (key === "hr_joining") {
    const rows = employees.filter(
      (e) => e.dateOfJoining && e.dateOfJoining >= dateFrom && e.dateOfJoining <= dateTo,
    );
    return buildResult(
      key,
      title,
      [
        { key: "employeeCode", header: "Code" },
        { key: "employeeName", header: "Name" },
        { key: "department", header: "Department" },
        { key: "dateOfJoining", header: "Joined" },
      ],
      rows,
    );
  }

  // hr_probation
  return buildResult(
    key,
    title,
    [
      { key: "employeeCode", header: "Code" },
      { key: "employeeName", header: "Name" },
      { key: "department", header: "Department" },
      { key: "dateOfJoining", header: "Joined" },
    ],
    periodEmployees.filter((e) => e.employmentStatus === "probation"),
  );
}

async function runAttendanceReport(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  key: ReportKey,
  filters: ReportFilters,
): Promise<ReportResult> {
  const organizationId = profile.employee.organizationId;
  const { dateFrom, dateTo } = resolveDates(filters);
  const title = REPORT_KEY_LABELS[key];

  let query = fromHrms(supabase, "attendance")
    .select(
      `
      id, attendance_date, attendance_status, check_in_at, check_out_at, overtime_hours,
      employee_id,
      employees:employee_id(employee_code, first_name, last_name, department_id, departments:department_id(name))
    `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("attendance_date", dateFrom)
    .lte("attendance_date", dateTo)
    .order("attendance_date", { ascending: false })
    .limit(3000);

  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.teamEmployeeIds?.length) query = query.in("employee_id", filters.teamEmployeeIds);
  if (filters.status) query = query.eq("attendance_status", filters.status);

  if (key === "attendance_late") query = query.eq("attendance_status", "late");
  if (key === "attendance_absent") query = query.eq("attendance_status", "absent");
  if (key === "attendance_holiday") query = query.in("attendance_status", ["holiday", "week_off"]);
  if (key === "attendance_overtime") query = query.gt("overtime_hours", 0);

  if (key === "attendance_weekly") {
    const from = new Date(dateTo);
    from.setDate(from.getDate() - 6);
    query = query.gte("attendance_date", from.toISOString().slice(0, 10));
  }

  if (key === "attendance_monthly" && filters.month && filters.year) {
    const start = `${filters.year}-${String(filters.month).padStart(2, "0")}-01`;
    const end = format(new Date(filters.year, filters.month, 0), "yyyy-MM-dd");
    query = query.gte("attendance_date", start).lte("attendance_date", end);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  if (key === "attendance_monthly") {
    const map = new Map<string, number>();
    for (const row of (data ?? []) as ReportRowLoose[]) {
      map.set(row.attendance_status, (map.get(row.attendance_status) ?? 0) + 1);
    }
    return buildResult(
      key,
      title,
      [
        { key: "status", header: "Status" },
        { key: "count", header: "Count" },
      ],
      Array.from(map.entries()).map(([status, count]) => ({ status, count })),
    );
  }

  const rows = ((data ?? []) as ReportRowLoose[])
    .filter((row) => {
      if (!filters.departmentId) return true;
      const emp = unwrapRelation(row.employees);
      return emp?.department_id === filters.departmentId;
    })
    .map((row) => {
      const emp = unwrapRelation(row.employees);
      const dept = unwrapRelation(emp?.departments);
      const statusMap: Record<string, string> = {
        present: "Present",
        absent: "Absent",
        late: "Late",
        half_day: "Half Day",
        holiday: "Holiday",
        week_off: "Week Off",
        on_leave: "On Leave",
      };
      const fmtTs = (ts: string | null) => {
        if (!ts) return "—";
        const d = new Date(ts);
        return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
      };
      return {
        date: row.attendance_date,
        employeeCode: emp?.employee_code ?? "—",
        employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
        department: dept?.name ?? "—",
        status: statusMap[row.attendance_status] ?? row.attendance_status,
        checkIn: fmtTs(row.check_in_at),
        checkOut: fmtTs(row.check_out_at),
        overtimeHours: Number(row.overtime_hours ?? 0) > 0 ? `${Number(row.overtime_hours).toFixed(1)} hrs` : "—",
      };
    });

  return buildResult(
    key,
    title,
    [
      { key: "date", header: "Date" },
      { key: "employeeCode", header: "Code" },
      { key: "employeeName", header: "Employee" },
      { key: "department", header: "Department" },
      { key: "status", header: "Status" },
      { key: "checkIn", header: "Check In" },
      { key: "checkOut", header: "Check Out" },
      { key: "overtimeHours", header: "OT Hours" },
    ],
    rows,
  );
}

async function runLeaveReport(
  supabase: AuthSupabaseClient,
  organizationId: string,
  key: ReportKey,
  filters: ReportFilters,
): Promise<ReportResult> {
  const title = REPORT_KEY_LABELS[key];
  const { dateFrom, dateTo } = resolveDates(filters);

  if (key === "leave_balance") {
    let query = fromHrms(supabase, "leave_balances")
      .select(
        `
        leave_type_id,
        balance_days, used_days, allocated_days,
        employees:employee_id!inner(employee_code, first_name, last_name, department_id, organization_id),
        leave_types:leave_type_id(name)
      `,
      )
      .eq("employees.organization_id", organizationId)
      .is("deleted_at", null)
      .limit(3000);
    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    if (filters.leaveTypeId) query = query.eq("leave_type_id", filters.leaveTypeId);
    if (filters.teamEmployeeIds?.length) query = query.in("employee_id", filters.teamEmployeeIds);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = ((data ?? []) as ReportRowLoose[])
      .filter((row) => {
        if (!filters.leaveTypeId) return true;
        return String(row.leave_type_id ?? "") === String(filters.leaveTypeId);
      })
      .filter((row) => {
        if (!filters.departmentId) return true;
        return unwrapRelation(row.employees)?.department_id === filters.departmentId;
      })
      .map((row) => {
        const emp = unwrapRelation(row.employees);
        const type = unwrapRelation(row.leave_types);
        return {
          employeeCode: emp?.employee_code ?? "—",
          employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
          leaveType: type?.name ?? "—",
          allocated: Number(row.allocated_days ?? 0),
          used: Number(row.used_days ?? 0),
          balance: Number(row.balance_days ?? 0),
        };
      });
    return buildResult(
      key,
      title,
      [
        { key: "employeeCode", header: "Code" },
        { key: "employeeName", header: "Employee" },
        { key: "leaveType", header: "Leave Type" },
        { key: "allocated", header: "Allocated" },
        { key: "used", header: "Used" },
        { key: "balance", header: "Balance" },
      ],
      rows,
    );
  }

  let query = fromHrms(supabase, "leave_requests")
    .select(
      `
      id, start_date, end_date, total_days, leave_status, reason, leave_type_id,
      employees:employee_id!inner(employee_code, first_name, last_name, department_id, organization_id),
      leave_types:leave_type_id(name)
    `,
    )
    .eq("employees.organization_id", organizationId)
    .is("deleted_at", null)
    .gte("start_date", dateFrom)
    .lte("start_date", dateTo)
    .order("start_date", { ascending: false })
    .limit(3000);

  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.leaveTypeId) query = query.eq("leave_type_id", filters.leaveTypeId);
  if (filters.teamEmployeeIds?.length) query = query.in("employee_id", filters.teamEmployeeIds);
  if (key === "leave_rejected") query = query.eq("leave_status", "rejected");
  if (key === "leave_pending") query = query.eq("leave_status", "pending");
  if (key === "leave_utilization" || key === "leave_trends") {
    query = query.eq("leave_status", "approved");
  }
  if (filters.status) query = query.eq("leave_status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  if (key === "leave_trends") {
    const map = new Map<string, number>();
    for (const row of (data ?? []) as ReportRowLoose[]) {
      const m = monthKey(row.start_date);
      map.set(m, (map.get(m) ?? 0) + Number(row.total_days ?? 0));
    }
    return buildResult(
      key,
      title,
      [
        { key: "month", header: "Month" },
        { key: "days", header: "Leave Days" },
      ],
      Array.from(map.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([month, days]) => ({ month, days })),
    );
  }

  const rows = ((data ?? []) as ReportRowLoose[])
    .filter((row) => {
      if (!filters.leaveTypeId) return true;
      return String(row.leave_type_id ?? "") === String(filters.leaveTypeId);
    })
    .filter((row) => {
      if (!filters.departmentId) return true;
      return unwrapRelation(row.employees)?.department_id === filters.departmentId;
    })
    .map((row) => {
      const emp = unwrapRelation(row.employees);
      const type = unwrapRelation(row.leave_types);
      return {
        employeeCode: emp?.employee_code ?? "—",
        employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
        leaveType: type?.name ?? "—",
        startDate: row.start_date,
        endDate: row.end_date,
        days: Number(row.total_days ?? 0),
        status: row.leave_status,
        reason: row.reason ?? "",
      };
    });

  return buildResult(
    key,
    title,
    [
      { key: "employeeCode", header: "Code" },
      { key: "employeeName", header: "Employee" },
      { key: "leaveType", header: "Type" },
      { key: "startDate", header: "From" },
      { key: "endDate", header: "To" },
      { key: "days", header: "Days" },
      { key: "status", header: "Status" },
      { key: "reason", header: "Reason" },
    ],
    rows,
  );
}

function resolvePayrollPeriod(filters: ReportFilters) {
  if (filters.month && filters.year) {
    const paddedMonth = String(filters.month).padStart(2, "0");
    const dateFrom = `${filters.year}-${paddedMonth}-01`;
    const dateTo = format(new Date(filters.year, filters.month, 0), "yyyy-MM-dd");
    return { dateFrom, dateTo };
  }
  return resolveDates(filters, 365);
}

async function runPayrollReport(
  supabase: AuthSupabaseClient,
  organizationId: string,
  key: ReportKey,
  filters: ReportFilters,
): Promise<ReportResult> {
  const title = REPORT_KEY_LABELS[key];
  const { dateFrom, dateTo } = resolvePayrollPeriod(filters);

  if (key === "payroll_salary") {
    let query = fromHrms(supabase, "salary_structures")
      .select(
        `
        gross_salary, net_salary, basic_salary, effective_from, effective_to,
        employees:employee_id!inner(employee_code, first_name, last_name, department_id, organization_id)
      `,
      )
      .eq("employees.organization_id", organizationId)
      .is("deleted_at", null)
      .is("effective_to", null)
      .limit(2000);
    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = ((data ?? []) as ReportRowLoose[])
      .filter((row) => {
        if (!filters.departmentId) return true;
        return unwrapRelation(row.employees)?.department_id === filters.departmentId;
      })
      .map((row) => {
        const emp = unwrapRelation(row.employees);
        return {
          employeeCode: emp?.employee_code ?? "—",
          employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
          basic: Number(row.basic_salary ?? 0),
          gross: Number(row.gross_salary ?? 0),
          net: Number(row.net_salary ?? 0),
          effectiveFrom: row.effective_from,
        };
      });
    return buildResult(
      key,
      title,
      [
        { key: "employeeCode", header: "Code" },
        { key: "employeeName", header: "Employee" },
        { key: "basic", header: "Basic" },
        { key: "gross", header: "Gross" },
        { key: "net", header: "Net" },
        { key: "effectiveFrom", header: "Effective From" },
      ],
      rows,
    );
  }

  if (key === "payroll_bonuses") {
    let query = fromHrms(supabase, "employee_bonuses")
      .select(
        `
        amount, bonus_type, bonus_status, bonus_month, reason,
        employees:employee_id(employee_code, first_name, last_name)
      `,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("bonus_month", dateFrom.slice(0, 7) + "-01")
      .lte("bonus_month", dateTo.slice(0, 7) + "-01")
      .order("bonus_month", { ascending: false })
      .limit(2000);
    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    if (filters.status) query = query.eq("bonus_status", filters.status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return buildResult(
      key,
      title,
      [
        { key: "employeeCode", header: "Code" },
        { key: "employeeName", header: "Employee" },
        { key: "type", header: "Type" },
        { key: "amount", header: "Amount" },
        { key: "status", header: "Status" },
        { key: "date", header: "Month" },
      ],
      ((data ?? []) as ReportRowLoose[]).map((row) => {
        const emp = unwrapRelation(row.employees);
        return {
          employeeCode: emp?.employee_code ?? "—",
          employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
          type: row.bonus_type,
          amount: Number(row.amount ?? 0),
          status: row.bonus_status,
          date: row.bonus_month,
        };
      }),
    );
  }

  if (key === "payroll_reimbursements") {
    let query = fromHrms(supabase, "employee_reimbursements")
      .select(
        `
        amount, category, reimbursement_status, expense_date, description,
        employees:employee_id(employee_code, first_name, last_name)
      `,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("expense_date", dateFrom)
      .lte("expense_date", dateTo)
      .order("expense_date", { ascending: false })
      .limit(2000);
    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    if (filters.status) query = query.eq("reimbursement_status", filters.status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return buildResult(
      key,
      title,
      [
        { key: "employeeCode", header: "Code" },
        { key: "employeeName", header: "Employee" },
        { key: "category", header: "Category" },
        { key: "amount", header: "Amount" },
        { key: "status", header: "Status" },
        { key: "date", header: "Date" },
      ],
      ((data ?? []) as ReportRowLoose[]).map((row) => {
        const emp = unwrapRelation(row.employees);
        return {
          employeeCode: emp?.employee_code ?? "—",
          employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
          category: row.category,
          amount: Number(row.amount ?? 0),
          status: row.reimbursement_status,
          date: row.expense_date,
        };
      }),
    );
  }

  if (key === "payroll_net") {
    let query = fromHrms(supabase, "payslips")
      .select(
        `
        issued_at,
        employees:employee_id!inner(employee_code, first_name, last_name, organization_id),
        payroll_items:payroll_item_id(gross_salary, total_deductions, net_salary),
        payrolls:payroll_id(payroll_month, payroll_status)
      `,
      )
      .eq("employees.organization_id", organizationId)
      .is("deleted_at", null)
      .order("issued_at", { ascending: false })
      .limit(3000);
    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const fromMonth = `${dateFrom.slice(0, 7)}-01`;
    const toMonth = `${dateTo.slice(0, 7)}-01`;
    return buildResult(
      key,
      title,
      [
        { key: "month", header: "Month" },
        { key: "employeeCode", header: "Code" },
        { key: "employeeName", header: "Employee" },
        { key: "gross", header: "Gross" },
        { key: "deductions", header: "Deductions" },
        { key: "net", header: "Net" },
      ],
      ((data ?? []) as ReportRowLoose[])
        .filter((row) => {
          const payroll = unwrapRelation(row.payrolls);
          const month = payroll?.payroll_month as string | undefined;
          if (!month) return false;
          return month >= fromMonth && month <= toMonth;
        })
        .map((row) => {
          const emp = unwrapRelation(row.employees);
          const item = unwrapRelation(row.payroll_items);
          const payroll = unwrapRelation(row.payrolls);
          return {
            month: payroll?.payroll_month ?? "",
            employeeCode: emp?.employee_code ?? "—",
            employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
            gross: Number(item?.gross_salary ?? 0),
            deductions: Number(item?.total_deductions ?? 0),
            net: Number(item?.net_salary ?? 0),
          };
        }),
    );
  }

  // payroll_register / payroll_deductions
  let query = fromHrms(supabase, "payrolls")
    .select(
      "id, payroll_month, payroll_status, total_gross, total_deductions, total_net, processed_at",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("payroll_month", dateFrom.slice(0, 7) + "-01")
    .lte("payroll_month", dateTo.slice(0, 7) + "-01")
    .order("payroll_month", { ascending: false })
    .limit(500);
  if (filters.status) query = query.eq("payroll_status", filters.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return buildResult(
    key,
    title,
    [
      { key: "month", header: "Month" },
      { key: "status", header: "Status" },
      { key: "gross", header: "Gross" },
      { key: "deductions", header: "Deductions" },
      { key: "net", header: "Net" },
      { key: "processedAt", header: "Processed" },
    ],
    ((data ?? []) as ReportRowLoose[]).map((row) => ({
      month: row.payroll_month,
      status: row.payroll_status,
      gross: Number(row.total_gross ?? 0),
      deductions: Number(row.total_deductions ?? 0),
      net: Number(row.total_net ?? 0),
      processedAt: row.processed_at ?? "",
    })),
  );
}

async function runPerformanceReport(
  supabase: AuthSupabaseClient,
  organizationId: string,
  key: ReportKey,
  filters: ReportFilters,
): Promise<ReportResult> {
  const title = REPORT_KEY_LABELS[key];
  const { dateFrom, dateTo } = resolvePayrollPeriod(filters);

  if (key === "performance_kpi") {
    let query = fromHrms(supabase, "performance_kpis")
      .select(
        `
        title, kpi_status, completion_percentage, current_value, target_value, end_date,
        employees:employee_id(employee_code, first_name, last_name)
      `,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      // KPI completion report should be driven by when the KPI record was created/assigned in the selected month.
      // Filtering only by `end_date` can return 0 rows even when there are KPIs active/assigned in that month.
      .gte("created_at", dateFrom)
      .lte("created_at", `${dateTo}T23:59:59`)
      .limit(2000);
    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    if (filters.teamEmployeeIds?.length) query = query.in("employee_id", filters.teamEmployeeIds);
    if (filters.status) query = query.eq("kpi_status", filters.status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return buildResult(
      key,
      title,
      [
        { key: "employeeCode", header: "Code" },
        { key: "employeeName", header: "Employee" },
        { key: "title", header: "KPI" },
        { key: "status", header: "Status" },
        { key: "completion", header: "Completion %" },
        { key: "endDate", header: "End Date" },
      ],
      ((data ?? []) as ReportRowLoose[]).map((row) => {
        const emp = unwrapRelation(row.employees);
        const kpiStatusRaw = String(row.kpi_status ?? "");
        const statusLabel = kpiStatusRaw
          ? kpiStatusRaw
              .split("_")
              .filter(Boolean)
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")
          : "—";
        return {
          employeeCode: emp?.employee_code ?? "—",
          employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
          title: row.title,
          status: statusLabel,
          completion: Number(row.completion_percentage ?? 0),
          endDate: row.end_date ?? "",
        };
      }),
    );
  }

  if (key === "performance_goals") {
    let query = fromHrms(supabase, "performance_goals")
      .select(
        `
        title, goal_status, current_progress, due_date,
        employees:employee_id(employee_code, first_name, last_name)
      `,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(
        `and(due_date.gte.${dateFrom},due_date.lte.${dateTo}),and(due_date.is.null,created_at.gte.${dateFrom},created_at.lte.${dateTo}T23:59:59)`,
      )
      .limit(2000);
    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    if (filters.teamEmployeeIds?.length) query = query.in("employee_id", filters.teamEmployeeIds);
    if (filters.status) query = query.eq("goal_status", filters.status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return buildResult(
      key,
      title,
      [
        { key: "employeeCode", header: "Code" },
        { key: "employeeName", header: "Employee" },
        { key: "title", header: "Goal" },
        { key: "status", header: "Status" },
        { key: "progress", header: "Progress %" },
        { key: "targetDate", header: "Due Date" },
      ],
      ((data ?? []) as ReportRowLoose[]).map((row) => {
        const emp = unwrapRelation(row.employees);
        return {
          employeeCode: emp?.employee_code ?? "—",
          employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
          title: row.title,
          status: row.goal_status,
          progress: Number(row.current_progress ?? 0),
          targetDate: row.due_date ?? "",
        };
      }),
    );
  }

  if (key === "performance_reviews") {
    let query = fromHrms(supabase, "performance_reviews")
      .select(
        `
        created_at, submitted_at, review_status, overall_rating,
        employees:employee_id(employee_code, first_name, last_name)
      `,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("created_at", dateFrom)
      .lte("created_at", `${dateTo}T23:59:59`)
      .limit(2000);
    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    if (filters.teamEmployeeIds?.length) query = query.in("employee_id", filters.teamEmployeeIds);
    if (filters.status) query = query.eq("review_status", filters.status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return buildResult(
      key,
      title,
      [
        { key: "employeeCode", header: "Code" },
        { key: "employeeName", header: "Employee" },
        { key: "period", header: "Submitted" },
        { key: "status", header: "Status" },
        { key: "overall", header: "Overall" },
      ],
      ((data ?? []) as ReportRowLoose[]).map((row) => {
        const emp = unwrapRelation(row.employees);
        return {
          employeeCode: emp?.employee_code ?? "—",
          employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
          period: row.submitted_at || row.created_at || "",
          status: row.review_status,
          overall: row.overall_rating ?? "",
        };
      }),
    );
  }

  let promoQuery = fromHrms(supabase, "performance_promotions")
    .select(
      `
      promotion_status, created_at, reason, current_salary, recommended_salary,
      employees:employee_id(employee_code, first_name, last_name),
      recommended_designation:recommended_designation_id(title)
    `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("created_at", dateFrom)
    .lte("created_at", `${dateTo}T23:59:59`)
    .limit(1000);
  if (filters.employeeId) promoQuery = promoQuery.eq("employee_id", filters.employeeId);
  if (filters.teamEmployeeIds?.length) promoQuery = promoQuery.in("employee_id", filters.teamEmployeeIds);
  if (filters.status) promoQuery = promoQuery.eq("promotion_status", filters.status);
  const { data, error } = await promoQuery;
  if (error) throw new Error(error.message);
  return buildResult(
    key,
    title,
    [
      { key: "employeeCode", header: "Code" },
      { key: "employeeName", header: "Employee" },
      { key: "designation", header: "Proposed Designation" },
      { key: "status", header: "Status" },
      { key: "recommendedAt", header: "Recommended" },
      { key: "recommendedSalary", header: "Proposed Salary" },
    ],
    ((data ?? []) as ReportRowLoose[]).map((row) => {
      const emp = unwrapRelation(row.employees);
      const desig = unwrapRelation(row.recommended_designation);
      return {
        employeeCode: emp?.employee_code ?? "—",
        employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
        designation: desig?.title ?? "—",
        status: row.promotion_status,
        recommendedAt: row.created_at ?? "",
        recommendedSalary: Number(row.recommended_salary ?? 0),
      };
    }),
  );
}

async function runRecruitmentReport(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  key: ReportKey,
  filters: ReportFilters,
): Promise<ReportResult> {
  const organizationId = profile.employee.organizationId;
  const title = REPORT_KEY_LABELS[key];

  if (key === "recruitment_funnel" || key === "recruitment_time_to_hire") {
    if (filters.recruitmentDepartmentIds?.length) {
      const { data: scopedCandidates, error: scopedError } = await fromHrms(
        supabase,
        "recruitment_candidates",
      )
        .select("stage, created_at, joined_at, job:job_opening_id!inner(department_id)")
        .eq("organization_id", organizationId)
        .in("job.department_id", filters.recruitmentDepartmentIds)
        .is("deleted_at", null)
        .is("archived_at", null);
      if (scopedError) throw new Error(scopedError.message);
      const rows = (scopedCandidates ?? []) as ReportRowLoose[];
      if (key === "recruitment_funnel") {
        const stageMap = new Map<string, number>();
        for (const row of rows) {
          stageMap.set(row.stage, (stageMap.get(row.stage) ?? 0) + 1);
        }
        return buildResult(
          key,
          title,
          [
            { key: "stage", header: "Stage" },
            { key: "count", header: "Count" },
          ],
          Array.from(stageMap.entries()).map(([stage, count]) => ({ stage, count })),
        );
      }
      const joined = rows.filter((row) => row.stage === "joined" && row.joined_at && row.created_at);
      const averageTimeToHireDays =
        joined.length > 0
          ? Math.round(
              joined.reduce((sum, row) => {
                const start = new Date(row.created_at).getTime();
                const end = new Date(row.joined_at).getTime();
                return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
              }, 0) / joined.length,
            )
          : 0;
      return buildResult(
        key,
        title,
        [
          { key: "metric", header: "Metric" },
          { key: "value", header: "Value" },
        ],
        [{ metric: "Average Time to Hire (days)", value: averageTimeToHireDays }],
      );
    }

    const analytics = await getHiringAnalytics(supabase, profile);
    if (key === "recruitment_funnel") {
      return buildResult(
        key,
        title,
        [
          { key: "stage", header: "Stage" },
          { key: "count", header: "Count" },
        ],
        analytics.pipeline.map((f) => ({ stage: f.stage, count: f.count })),
      );
    }
    return buildResult(
      key,
      title,
      [
        { key: "metric", header: "Metric" },
        { key: "value", header: "Value" },
      ],
      [
        { metric: "Total Applications", value: analytics.totalApplications },
        { metric: "Selected / Hired", value: analytics.selectedHired },
        { metric: "Rejected", value: analytics.rejected },
        { metric: "Hiring Rate %", value: analytics.hiringRate },
        { metric: "Average Time to Hire (days)", value: analytics.averageTimeToHireDays },
        { metric: "Offer Acceptance %", value: analytics.offerAcceptanceRate },
      ],
    );
  }

  if (key === "recruitment_jobs") {
    let query = fromHrms(supabase, "recruitment_job_openings")
      .select(
        "job_code, title, job_status, open_positions, location, created_at, departments:department_id(name)",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500);
    if (filters.status) query = query.eq("job_status", filters.status);
    else query = query.in("job_status", ["open", "on_hold", "draft"]);
    if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
    if (filters.recruitmentDepartmentIds?.length) {
      query = query.in("department_id", filters.recruitmentDepartmentIds);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return buildResult(
      key,
      title,
      [
        { key: "code", header: "Code" },
        { key: "title", header: "Title" },
        { key: "department", header: "Department" },
        { key: "openings", header: "Openings" },
        { key: "status", header: "Status" },
      ],
      ((data ?? []) as ReportRowLoose[]).map((row) => ({
        code: row.job_code,
        title: row.title,
        department: unwrapRelation(row.departments)?.name ?? "—",
        openings: Number(row.open_positions ?? 0),
        status: row.job_status,
      })),
    );
  }

  if (key === "recruitment_offers") {
    const { data, error } = await fromHrms(supabase, "recruitment_offers")
      .select(
        `
        offer_status, salary, created_at, responded_at, joining_date,
        candidates:candidate_id(first_name, last_name, email)
      `,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return buildResult(
      key,
      title,
      [
        { key: "candidate", header: "Candidate" },
        { key: "salary", header: "Salary" },
        { key: "status", header: "Status" },
        { key: "offeredAt", header: "Offered" },
        { key: "respondedAt", header: "Responded" },
      ],
      ((data ?? []) as ReportRowLoose[]).map((row) => {
        const c = unwrapRelation(row.candidates);
        return {
          candidate: formatEmployeeName(c?.first_name, c?.last_name),
          salary: Number(row.salary ?? 0),
          status: row.offer_status,
          offeredAt: row.created_at ?? "",
          respondedAt: row.responded_at ?? "",
        };
      }),
    );
  }

  // pipeline
  let query = fromHrms(supabase, "recruitment_candidates")
    .select(
      `
      first_name, last_name, email, stage, source, created_at,
      jobs:job_opening_id(title, department_id)
    `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (filters.status) query = query.eq("stage", filters.status);
  if (filters.recruitmentDepartmentIds?.length) {
    query = query.in("jobs.department_id", filters.recruitmentDepartmentIds);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return buildResult(
    key,
    title,
    [
      { key: "candidate", header: "Candidate" },
      { key: "email", header: "Email" },
      { key: "job", header: "Job" },
      { key: "stage", header: "Stage" },
      { key: "source", header: "Source" },
    ],
    ((data ?? []) as ReportRowLoose[]).map((row) => ({
      candidate: formatEmployeeName(row.first_name, row.last_name),
      email: row.email ?? "",
      job: unwrapRelation(row.jobs)?.title ?? "—",
      stage: row.stage,
      source: row.source ?? "",
    })),
  );
}

async function runAssetsReport(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  key: ReportKey,
): Promise<ReportResult> {
  const title = REPORT_KEY_LABELS[key];
  const reports = await getAssetsReports(supabase, profile);

  if (key === "assets_warranty") {
    return buildResult(
      key,
      title,
      [
        { key: "assetCode", header: "Code" },
        { key: "name", header: "Asset" },
        { key: "warrantyExpiry", header: "Warranty Expiry" },
        { key: "status", header: "Status" },
      ],
      reports.warrantyExpiry.map((a) => ({
        assetCode: a.assetCode,
        name: a.name,
        warrantyExpiry: a.warrantyExpiry,
        status: a.assetStatus,
      })),
    );
  }

  if (key === "assets_maintenance") {
    const organizationId = profile.employee.organizationId;
    const { data, error } = await fromHrms(supabase, "asset_maintenance")
      .select(
        `
        maintenance_date, issue, cost, maintenance_status, next_service_date,
        assets:asset_id(asset_code, name)
      `,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("maintenance_date", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return buildResult(
      key,
      title,
      [
        { key: "assetCode", header: "Code" },
        { key: "assetName", header: "Asset" },
        { key: "date", header: "Date" },
        { key: "issue", header: "Issue" },
        { key: "cost", header: "Cost" },
        { key: "status", header: "Status" },
      ],
      ((data ?? []) as ReportRowLoose[]).map((row) => {
        const asset = unwrapRelation(row.assets);
        return {
          assetCode: asset?.asset_code ?? "—",
          assetName: asset?.name ?? "—",
          date: row.maintenance_date,
          issue: row.issue,
          cost: Number(row.cost ?? 0),
          status: row.maintenance_status,
        };
      }),
    );
  }

  const organizationId = profile.employee.organizationId;
  const status = key === "assets_returned" ? "returned" : "active";
  const { data, error } = await fromHrms(supabase, "asset_assignments")
    .select(
      `
      assigned_date, returned_date, assignment_status,
      assets:asset_id(asset_code, name),
      employees:employee_id(employee_code, first_name, last_name)
    `,
    )
    .eq("organization_id", organizationId)
    .eq("assignment_status", status)
    .is("deleted_at", null)
    .order("assigned_date", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);

  return buildResult(
    key,
    title,
    [
      { key: "assetCode", header: "Code" },
      { key: "assetName", header: "Asset" },
      { key: "employeeCode", header: "Emp Code" },
      { key: "employeeName", header: "Employee" },
      { key: "assignedDate", header: "Assigned" },
      { key: "returnedDate", header: "Returned" },
      { key: "status", header: "Status" },
    ],
    ((data ?? []) as ReportRowLoose[]).map((row) => {
      const asset = unwrapRelation(row.assets);
      const emp = unwrapRelation(row.employees);
      return {
        assetCode: asset?.asset_code ?? "—",
        assetName: asset?.name ?? "—",
        employeeCode: emp?.employee_code ?? "—",
        employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
        assignedDate: row.assigned_date,
        returnedDate: row.returned_date ?? "",
        status: row.assignment_status,
      };
    }),
  );
}

async function runExitReport(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  key: ReportKey,
  filters: ReportFilters,
): Promise<ReportResult> {
  const organizationId = profile.employee.organizationId;
  const title = REPORT_KEY_LABELS[key];
  const summary = await getExitSummary(supabase, profile);

  if (key === "exit_attrition") {
    return buildResult(
      key,
      title,
      [
        { key: "month", header: "Month" },
        { key: "count", header: "Exits" },
      ],
      summary.monthlyAttrition.map((m) => ({ month: m.month, count: m.count })),
    );
  }

  if (key === "exit_reasons") {
    return buildResult(
      key,
      title,
      [
        { key: "reason", header: "Reason" },
        { key: "count", header: "Count" },
      ],
      summary.exitReasons.map((r) => ({ reason: r.reason, count: r.count })),
    );
  }

  if (key === "exit_settlement") {
    const { dateFrom, dateTo } = resolveDates(filters);
    let settlementQuery = fromHrms(supabase, "exit_settlements")
      .select(
        `
        settlement_status, net_payable, approved_at,
        employees:employee_id(employee_code, first_name, last_name),
        exit_resignations:resignation_id(exit_status, last_working_day)
      `,
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("approved_at", dateFrom)
      .lte("approved_at", dateTo)
      .limit(1000);
    if (filters.status) settlementQuery = settlementQuery.eq("settlement_status", filters.status);
    const { data, error } = await settlementQuery;
    if (error) throw new Error(error.message);
    return buildResult(
      key,
      title,
      [
        { key: "employeeCode", header: "Code" },
        { key: "employeeName", header: "Employee" },
        { key: "settlementStatus", header: "Settlement" },
        { key: "netPayable", header: "Net Payable" },
        { key: "lastWorkingDay", header: "LWD" },
        { key: "exitStatus", header: "Exit Status" },
      ],
      ((data ?? []) as ReportRowLoose[]).map((row) => {
        const emp = unwrapRelation(row.employees);
        const resignation = unwrapRelation(row.exit_resignations);
        return {
          employeeCode: emp?.employee_code ?? "—",
          employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
          settlementStatus: row.settlement_status,
          netPayable: Number(row.net_payable ?? 0),
          lastWorkingDay: resignation?.last_working_day ?? "",
          exitStatus: resignation?.exit_status ?? "",
        };
      }),
    );
  }

  const { dateFrom, dateTo } = resolveDates(filters);
  let query = fromHrms(supabase, "exit_resignations")
    .select(
      `
      resignation_date, last_working_day, notice_period_days, reason, exit_status,
      employees:employee_id(employee_code, first_name, last_name, department_id, departments:department_id(name))
    `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("resignation_date", dateFrom)
    .lte("resignation_date", dateTo)
    .order("resignation_date", { ascending: false })
    .limit(1000);
  if (filters.status) query = query.eq("exit_status", filters.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return buildResult(
    key,
    title,
    [
      { key: "employeeCode", header: "Code" },
      { key: "employeeName", header: "Employee" },
      { key: "department", header: "Department" },
      { key: "resignationDate", header: "Resignation" },
      { key: "lastWorkingDay", header: "LWD" },
      { key: "reason", header: "Reason" },
      { key: "status", header: "Status" },
    ],
    ((data ?? []) as ReportRowLoose[])
      .filter((row) => {
        if (!filters.departmentId) return true;
        return unwrapRelation(row.employees)?.department_id === filters.departmentId;
      })
      .map((row) => {
        const emp = unwrapRelation(row.employees);
        const dept = unwrapRelation(emp?.departments);
        return {
          employeeCode: emp?.employee_code ?? "—",
          employeeName: formatEmployeeName(emp?.first_name, emp?.last_name),
          department: dept?.name ?? "—",
          resignationDate: row.resignation_date,
          lastWorkingDay: row.last_working_day,
          reason: row.reason,
          status: row.exit_status,
        };
      }),
  );
}

export async function runReport(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  key: ReportKey,
  filters: ReportFilters = {},
): Promise<ReportResult> {
  const organizationId = profile.employee.organizationId;

  if (key.startsWith("hr_")) return runHrReport(supabase, organizationId, key, filters);
  if (key.startsWith("attendance_")) {
    return runAttendanceReport(supabase, profile, key, filters);
  }
  if (key.startsWith("leave_")) return runLeaveReport(supabase, organizationId, key, filters);
  if (key.startsWith("payroll_")) {
    return runPayrollReport(supabase, organizationId, key, filters);
  }
  if (key.startsWith("performance_")) {
    return runPerformanceReport(supabase, organizationId, key, filters);
  }
  if (key.startsWith("recruitment_")) {
    return runRecruitmentReport(supabase, profile, key, filters);
  }
  if (key.startsWith("assets_")) return runAssetsReport(supabase, profile, key);
  if (key.startsWith("exit_")) return runExitReport(supabase, profile, key, filters);

  throw new Error(`Unknown report: ${key}`);
}
