import { differenceInMonths, format, startOfMonth } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import {
  getEmployeeAttendanceSummary,
  getEmployeeById,
  getEmployeeLeaveBalances,
} from "@/lib/employees/services/employee-detail";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { createSignedStorageUrl } from "@/lib/employees/services/employee-mutations";
import {
  buildHierarchyTree,
  listHierarchyEmployees,
} from "@/lib/organization/services/org-queries";
import { fromHrms, unwrapRelation } from "@/lib/reports/services/reports-utils";
import { ceoOrgListParamsSchema } from "@/lib/validations/ceo-organization";
import type { UserProfile } from "@/types/auth";
import type {
  CeoOrgDepartmentCard,
  CeoOrgDirectoryItem,
  CeoOrgEmployeeDetail,
  CeoOrgFilterLookups,
  CeoOrgListParams,
  CeoOrgListResult,
  CeoOrganizationPageData,
  CeoOrgSummary,
  CeoOrgWorkforceInsights,
} from "@/types/ceo-organization";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const ACTIVE_STATUSES = new Set(["active", "probation", "on_leave"]);

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return unwrapRelation(value as T | T[] | null);
}

function experienceYearsFromJoining(dateOfJoining: string | null | undefined): number | null {
  if (!dateOfJoining) return null;
  const months = differenceInMonths(new Date(), new Date(dateOfJoining));
  if (months < 0) return 0;
  return Math.round((months / 12) * 10) / 10;
}

function parseParams(params: CeoOrgListParams) {
  return ceoOrgListParamsSchema.parse(params);
}

export async function getCeoOrgSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoOrgSummary> {
  const organizationId = profile.employee.organizationId;

  const [employeesRes, departmentsRes, managersRes] = await Promise.all([
    fromHrms(supabase, "employees")
      .select("id, employment_status, reporting_manager_id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .limit(5000),
    fromHrms(supabase, "departments")
      .select("id, status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    fromHrms(supabase, "user_roles")
      .select(
        "id, roles:role_id!inner(code), employees:employee_id(id, employment_status)",
      )
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .is("deleted_at", null)
      .eq("roles.code", "manager"),
  ]);

  if (employeesRes.error) throw new Error(employeesRes.error.message);
  if (departmentsRes.error) throw new Error(departmentsRes.error.message);

  const empRows = (employeesRes.data ?? []) as LooseRow[];
  const activeEmployees = empRows.filter((row) => ACTIVE_STATUSES.has(row.employment_status));
  const activeDepartments = ((departmentsRes.data ?? []) as LooseRow[]).filter(
    (row) => row.status === "active" || !row.status,
  );

  const managerRows = (managersRes.data ?? []) as LooseRow[];
  const activeManagers = managerRows.filter((row) => {
    const employee = unwrap(row.employees);
    return employee && ACTIVE_STATUSES.has(employee.employment_status);
  });

  const reportCountByManager = new Map<string, number>();
  for (const row of activeEmployees) {
    if (!row.reporting_manager_id) continue;
    reportCountByManager.set(
      row.reporting_manager_id,
      (reportCountByManager.get(row.reporting_manager_id) ?? 0) + 1,
    );
  }

  const managerIdSet = new Set(
    activeManagers
      .map((row) => unwrap(row.employees)?.id as string | undefined)
      .filter(Boolean),
  );

  let teamLeads = 0;
  for (const [managerId, count] of reportCountByManager.entries()) {
    if (count > 0 && !managerIdSet.has(managerId)) teamLeads += 1;
  }

  const reportingEmployees = activeEmployees.filter((row) => row.reporting_manager_id).length;
  const reportingCoveragePercent =
    activeEmployees.length > 0
      ? Math.round((reportingEmployees / activeEmployees.length) * 1000) / 10
      : 0;

  const peopleWithReports = reportCountByManager.size;
  const averageTeamSize =
    peopleWithReports > 0
      ? Math.round((reportingEmployees / peopleWithReports) * 10) / 10
      : 0;

  return {
    totalEmployees: empRows.length,
    activeEmployees: activeEmployees.length,
    departments: activeDepartments.length,
    managers: activeManagers.length,
    teamLeads,
    reportingEmployees,
    reportingCoveragePercent,
    averageTeamSize,
  };
}

export async function getCeoOrgFilterLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<CeoOrgFilterLookups> {
  const [departmentsRes, managersQuery, employmentTypesRes] = await Promise.all([
    fromHrms(supabase, "departments")
      .select("id, name, code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "user_roles")
      .select(
        "id, roles:role_id!inner(code), employees:employee_id(id, first_name, last_name, employment_status, deleted_at)",
      )
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .is("deleted_at", null)
      .eq("roles.code", "manager"),
    fromHrms(supabase, "employment_types")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (departmentsRes.error) throw new Error(departmentsRes.error.message);
  if (managersQuery.error) throw new Error(managersQuery.error.message);
  if (employmentTypesRes.error) throw new Error(employmentTypesRes.error.message);

  const managers = new Map<string, { id: string; label: string }>();
  for (const row of (managersQuery.data ?? []) as LooseRow[]) {
    const employee = unwrap(row.employees);
    if (!employee?.id || employee.deleted_at) continue;
    if (!ACTIVE_STATUSES.has(employee.employment_status)) continue;
    managers.set(employee.id, {
      id: employee.id,
      label: `${employee.first_name} ${employee.last_name}`,
    });
  }

  return {
    departments: ((departmentsRes.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
      code: row.code ?? undefined,
    })),
    managers: [...managers.values()].sort((a, b) => a.label.localeCompare(b.label)),
    employmentTypes: ((employmentTypesRes.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
  };
}

export async function listCeoOrgEmployees(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoOrgListParams,
): Promise<CeoOrgListResult> {
  const {
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    departmentId,
    managerId,
    employmentStatus,
    employmentTypeId,
  } = parseParams(params);

  const organizationId = profile.employee.organizationId;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = fromHrms(supabase, "employees")
    .select(
      `
        id,
        employee_code,
        first_name,
        last_name,
        email,
        phone,
        employment_status,
        date_of_joining,
        branch_id,
        department_id,
        designation_id,
        employment_type_id,
        reporting_manager_id,
        branches:branch_id (name),
        departments:department_id (name),
        designations:designation_id (title),
        employment_types:employment_type_id (name),
        manager:reporting_manager_id (first_name, last_name),
        employee_profiles (profile_image_storage_path)
      `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},employee_code.ilike.${term}`,
    );
  }

  if (departmentId) query = query.eq("department_id", departmentId);
  if (managerId) query = query.eq("reporting_manager_id", managerId);
  if (employmentStatus) query = query.eq("employment_status", employmentStatus);
  if (employmentTypeId) query = query.eq("employment_type_id", employmentTypeId);

  query = query.order(sortBy, { ascending: sortOrder === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: ((data ?? []) as LooseRow[]).map((row): CeoOrgDirectoryItem => {
      const branch = unwrap(row.branches);
      const department = unwrap(row.departments);
      const designation = unwrap(row.designations);
      const employmentType = unwrap(row.employment_types);
      const manager = unwrap(row.manager);
      const employeeProfile = unwrap(row.employee_profiles);

      return {
        id: row.id,
        employeeCode: row.employee_code,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: `${row.first_name} ${row.last_name}`,
        email: row.email,
        phone: row.phone,
        employmentStatus: row.employment_status,
        dateOfJoining: row.date_of_joining,
        experienceYears: experienceYearsFromJoining(row.date_of_joining),
        departmentId: row.department_id,
        departmentName: department?.name ?? null,
        designationId: row.designation_id,
        designationTitle: designation?.title ?? null,
        employmentTypeId: row.employment_type_id,
        employmentTypeName: employmentType?.name ?? null,
        branchId: row.branch_id,
        branchName: branch?.name ?? null,
        location: branch?.name ?? null,
        reportingManagerId: row.reporting_manager_id,
        managerName: manager ? `${manager.first_name} ${manager.last_name}` : null,
        profileImagePath: employeeProfile?.profile_image_storage_path ?? null,
      };
    }),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getCeoOrgDepartments(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  departmentId?: string,
): Promise<CeoOrgDepartmentCard[]> {
  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();

  let departmentsQuery = fromHrms(supabase, "departments")
    .select(
      "id, name, department_head_id, department_head:department_head_id(first_name, last_name)",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");

  if (departmentId) departmentsQuery = departmentsQuery.eq("id", departmentId);

  const [departmentsRes, employeesRes, attendanceRes, reviewsRes, jobsRes] =
    await Promise.all([
      departmentsQuery,
      fromHrms(supabase, "employees")
        .select(
          "id, department_id, employment_status, date_of_joining, reporting_manager_id",
        )
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .limit(5000),
      fromHrms(supabase, "attendance")
        .select("employee_id, attendance_status, employees:employee_id(department_id)")
        .eq("organization_id", organizationId)
        .eq("attendance_date", today)
        .is("deleted_at", null),
      fromHrms(supabase, "performance_reviews")
        .select(
          "overall_rating, employees:employee_id!inner(department_id)",
        )
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .not("overall_rating", "is", null)
        .limit(3000),
      fromHrms(supabase, "recruitment_job_openings")
        .select("department_id, open_positions, job_status")
        .eq("organization_id", organizationId)
        .eq("job_status", "open")
        .is("deleted_at", null),
    ]);

  if (departmentsRes.error) throw new Error(departmentsRes.error.message);
  if (employeesRes.error) throw new Error(employeesRes.error.message);

  const empRows = (employeesRes.data ?? []) as LooseRow[];
  const activeByDept = new Map<string, LooseRow[]>();
  const managersByDept = new Map<string, Set<string>>();

  for (const row of empRows) {
    if (!row.department_id || !ACTIVE_STATUSES.has(row.employment_status)) continue;
    const list = activeByDept.get(row.department_id) ?? [];
    list.push(row);
    activeByDept.set(row.department_id, list);
  }

  for (const row of empRows) {
    if (!row.reporting_manager_id || !ACTIVE_STATUSES.has(row.employment_status)) continue;
    const manager = empRows.find((item) => item.id === row.reporting_manager_id);
    if (!manager?.department_id) continue;
    const set = managersByDept.get(manager.department_id) ?? new Set();
    set.add(manager.id);
    managersByDept.set(manager.department_id, set);
  }

  const attendanceByDept = new Map<string, { present: number; total: number }>();
  for (const row of (attendanceRes.data ?? []) as LooseRow[]) {
    const employee = unwrap(row.employees);
    const deptId = employee?.department_id;
    if (!deptId) continue;
    const current = attendanceByDept.get(deptId) ?? { present: 0, total: 0 };
    current.total += 1;
    if (["present", "late", "half_day"].includes(row.attendance_status)) {
      current.present += 1;
    }
    attendanceByDept.set(deptId, current);
  }

  const ratingByDept = new Map<string, number[]>();
  for (const row of (reviewsRes.data ?? []) as LooseRow[]) {
    const employee = unwrap(row.employees);
    const deptId = employee?.department_id;
    if (!deptId || row.overall_rating == null) continue;
    const list = ratingByDept.get(deptId) ?? [];
    list.push(Number(row.overall_rating));
    ratingByDept.set(deptId, list);
  }

  const openPositionsByDept = new Map<string, number>();
  for (const row of (jobsRes.data ?? []) as LooseRow[]) {
    if (!row.department_id) continue;
    openPositionsByDept.set(
      row.department_id,
      (openPositionsByDept.get(row.department_id) ?? 0) + Number(row.open_positions ?? 0),
    );
  }

  return ((departmentsRes.data ?? []) as LooseRow[]).map((dept) => {
    const employees = activeByDept.get(dept.id) ?? [];
    const attendance = attendanceByDept.get(dept.id);
    const ratings = ratingByDept.get(dept.id) ?? [];
    const experiences = employees
      .map((row) => experienceYearsFromJoining(row.date_of_joining))
      .filter((value): value is number => value != null);
    const head = unwrap(dept.department_head);

    return {
      id: dept.id,
      name: dept.name,
      headName: head ? `${head.first_name} ${head.last_name}` : null,
      employeeCount: employees.length,
      managerCount: managersByDept.get(dept.id)?.size ?? 0,
      attendancePercent:
        attendance && attendance.total > 0
          ? Math.round((attendance.present / attendance.total) * 1000) / 10
          : 0,
      performanceScore:
        ratings.length > 0
          ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) /
            10
          : null,
      openPositions: openPositionsByDept.get(dept.id) ?? 0,
      averageExperienceYears:
        experiences.length > 0
          ? Math.round(
              (experiences.reduce((sum, value) => sum + value, 0) / experiences.length) * 10,
            ) / 10
          : null,
    };
  });
}

export async function getCeoOrgWorkforceInsights(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  departmentId?: string,
): Promise<CeoOrgWorkforceInsights> {
  const organizationId = profile.employee.organizationId;
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  let employeesQuery = fromHrms(supabase, "employees")
    .select(
      `
        id,
        employment_status,
        date_of_joining,
        date_of_leaving,
        department_id,
        reporting_manager_id,
        departments:department_id(name),
        employment_types:employment_type_id(name)
      `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .limit(5000);

  if (departmentId) employeesQuery = employeesQuery.eq("department_id", departmentId);

  const { data, error } = await employeesQuery;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];
  const active = rows.filter((row) => ACTIVE_STATUSES.has(row.employment_status));

  const departmentDistribution = new Map<string, number>();
  const employmentTypeDistribution = new Map<string, number>();
  const managerDistribution = new Map<string, number>();

  for (const row of active) {
    const dept = unwrap(row.departments)?.name ?? "Unassigned";
    departmentDistribution.set(dept, (departmentDistribution.get(dept) ?? 0) + 1);

    const type = unwrap(row.employment_types)?.name ?? "Unassigned";
    employmentTypeDistribution.set(type, (employmentTypeDistribution.get(type) ?? 0) + 1);
  }

  for (const row of active) {
    if (!row.reporting_manager_id) continue;
    const manager = rows.find((item) => item.id === row.reporting_manager_id);
    const dept = unwrap(manager?.departments)?.name ?? "Unassigned";
    managerDistribution.set(dept, (managerDistribution.get(dept) ?? 0) + 1);
  }

  const experiences = active
    .map((row) => experienceYearsFromJoining(row.date_of_joining))
    .filter((value): value is number => value != null);

  return {
    departmentDistribution: [...departmentDistribution.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    employmentTypeDistribution: [...employmentTypeDistribution.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    managerDistribution: [...managerDistribution.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    averageExperienceYears:
      experiences.length > 0
        ? Math.round(
            (experiences.reduce((sum, value) => sum + value, 0) / experiences.length) * 10,
          ) / 10
        : null,
    newJoinersThisMonth: rows.filter(
      (row) => row.date_of_joining && String(row.date_of_joining) >= monthStart,
    ).length,
    employeesOnNotice: rows.filter((row) =>
      ["resigned", "terminated"].includes(row.employment_status),
    ).length,
    employeesOnProbation: active.filter((row) => row.employment_status === "probation").length,
  };
}

export async function getCeoOrgEmployeeDetail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
): Promise<CeoOrgEmployeeDetail | null> {
  const organizationId = profile.employee.organizationId;

  const [
    employee,
    attendanceSummary,
    leaveBalances,
    reviewsRes,
    promotionsRes,
    salaryRes,
    hierarchyEmployees,
  ] = await Promise.all([
    getEmployeeById(supabase, employeeId),
    getEmployeeAttendanceSummary(supabase, employeeId),
    getEmployeeLeaveBalances(supabase, employeeId),
    fromHrms(supabase, "performance_reviews")
      .select("overall_rating")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .not("overall_rating", "is", null)
      .order("created_at", { ascending: false })
      .limit(10),
    fromHrms(supabase, "performance_promotions")
      .select(
        "id, promotion_status, created_at, recommended_designation:recommended_designation_id(title)",
      )
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    fromHrms(supabase, "salary_revisions")
      .select("effective_from, created_at")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1),
    listHierarchyEmployees(supabase, organizationId),
  ]);

  if (!employee || employee.organizationId !== organizationId) return null;

  const ratings = ((reviewsRes.data ?? []) as LooseRow[])
    .map((row) => Number(row.overall_rating))
    .filter((value) => !Number.isNaN(value));

  const reportingChain: CeoOrgEmployeeDetail["reportingChain"] = [];
  let currentId: string | null = employee.reportingManagerId;
  const byId = new Map(hierarchyEmployees.map((item) => [item.id, item]));
  const visited = new Set<string>();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = byId.get(currentId);
    if (!node) break;
    reportingChain.push({
      id: node.id,
      fullName: node.fullName,
      designationTitle: node.designationTitle,
    });
    currentId = node.reportingManagerId;
  }

  let profileImageUrl: string | null = null;
  if (employee.profile?.profileImageStoragePath) {
    profileImageUrl = await createSignedStorageUrl(
      supabase,
      EMPLOYEE_STORAGE_BUCKETS.profileImages,
      employee.profile.profileImageStoragePath,
    );
  }

  const salaryRow = ((salaryRes.data ?? []) as LooseRow[])[0];

  return {
    employee,
    profileImageUrl,
    experienceYears: experienceYearsFromJoining(employee.dateOfJoining),
    reportingChain,
    attendanceSummary,
    leaveBalances,
    performanceRating:
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
        : null,
    recentPromotions: ((promotionsRes.data ?? []) as LooseRow[]).map((row) => {
      const designation = unwrap(row.recommended_designation);
      return {
        id: row.id,
        promotionStatus: row.promotion_status,
        recommendedDesignation: designation?.title ?? null,
        createdAt: row.created_at,
      };
    }),
    recentSalaryRevisionDate: salaryRow?.effective_from ?? salaryRow?.created_at ?? null,
  };
}

export async function getCeoOrganizationPageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoOrgListParams,
): Promise<CeoOrganizationPageData> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(params);

  const [summary, employees, lookups, departments, hierarchyEmployees, insights] =
    await Promise.all([
      getCeoOrgSummary(supabase, profile),
      listCeoOrgEmployees(supabase, profile, parsed),
      getCeoOrgFilterLookups(supabase, organizationId),
      getCeoOrgDepartments(supabase, profile, parsed.departmentId),
      listHierarchyEmployees(supabase, organizationId),
      getCeoOrgWorkforceInsights(supabase, profile, parsed.departmentId),
    ]);

  return {
    summary,
    employees,
    lookups,
    departments,
    hierarchyRoots: buildHierarchyTree(hierarchyEmployees),
    insights,
  };
}
