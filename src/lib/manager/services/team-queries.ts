import {
  addDays,
  format,
  isWithinInterval,
  parseISO,
} from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { EMPLOYMENT_STATUS_LABELS } from "@/lib/employees/constants";
import { getManagerTeamContext } from "@/lib/manager/services/team-hierarchy";
import { buildHierarchyTree } from "@/lib/organization/services/org-queries";
import { fromHrms, unwrapRelation } from "@/lib/reports/services/reports-utils";
import { teamListParamsSchema } from "@/lib/validations/manager-team";
import type { UserProfile } from "@/types/auth";
import type { HierarchyEmployee, HierarchyNode } from "@/types/organization";
import type {
  TeamFilterLookups,
  TeamListParams,
  TeamListResult,
  TeamMemberListItem,
  TeamSummary,
} from "@/types/manager-team";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const ACTIVE_EMPLOYMENT = ["active", "probation", "on_leave"] as const;
const CURRENT_YEAR = new Date().getFullYear();

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return unwrapRelation(value as T | T[] | null);
}

function parseParams(params: TeamListParams) {
  return teamListParamsSchema.parse(params);
}

export function assertTeamMember(teamIds: string[], employeeId: string) {
  if (!teamIds.includes(employeeId)) {
    throw new Error("You can only access employees in your reporting hierarchy.");
  }
}

function nextBirthdayWithinDays(
  dateOfBirth: string | null | undefined,
  from: Date,
  days: number,
): boolean {
  if (!dateOfBirth || dateOfBirth.length < 10) return false;
  const monthDay = dateOfBirth.slice(5, 10);
  const [month, day] = monthDay.split("-").map(Number);
  if (!month || !day) return false;

  const end = addDays(from, days);
  let candidate = new Date(from.getFullYear(), month - 1, day);
  const todayStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  if (candidate < todayStart) {
    candidate = new Date(from.getFullYear() + 1, month - 1, day);
  }

  return isWithinInterval(candidate, { start: todayStart, end });
}

export function buildManagerTeamTree(
  managerId: string,
  hierarchyEmployees: HierarchyEmployee[],
  teamIds: string[],
): HierarchyNode | null {
  const teamIdSet = new Set(teamIds);
  const scopedEmployees = hierarchyEmployees.filter(
    (employee) => employee.id === managerId || teamIdSet.has(employee.id),
  );

  const manager = scopedEmployees.find((employee) => employee.id === managerId);
  if (!manager) return null;

  const nodeMap = new Map<string, HierarchyNode>();
  for (const employee of scopedEmployees) {
    nodeMap.set(employee.id, {
      id: employee.id,
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      designationTitle: employee.designationTitle,
      departmentName: employee.departmentName,
      reportingManagerId: employee.reportingManagerId,
      children: [],
    });
  }

  for (const node of nodeMap.values()) {
    if (
      node.reportingManagerId &&
      nodeMap.has(node.reportingManagerId) &&
      node.id !== managerId
    ) {
      nodeMap.get(node.reportingManagerId)!.children.push(node);
    }
  }

  const root = nodeMap.get(managerId);
  if (!root) return null;

  const sortNodes = (nodes: HierarchyNode[]) => {
    nodes.sort((left, right) => left.fullName.localeCompare(right.fullName));
    for (const node of nodes) sortNodes(node.children);
  };
  sortNodes(root.children);

  return root;
}

export async function getManagerTeamScope(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
) {
  return getManagerTeamContext(
    supabase,
    profile.employee.organizationId,
    profile.employee.id,
  );
}

export async function getTeamSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
): Promise<TeamSummary> {
  if (teamIds.length === 0) {
    return {
      totalTeamMembers: 0,
      presentToday: 0,
      onLeaveToday: 0,
      probationEmployees: 0,
      upcomingBirthdays: 0,
      teamCompletionRate: 0,
    };
  }

  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const todayDate = parseISO(today);

  const [
    employeesResult,
    attendanceResult,
    profilesResult,
    reviewsResult,
  ] = await Promise.all([
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, employment_status")
      .eq("organization_id", organizationId)
      .in("id", teamIds)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("attendance")
      .select("employee_id, attendance_status")
      .eq("organization_id", organizationId)
      .eq("attendance_date", today)
      .in("employee_id", teamIds)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("employee_profiles")
      .select("employee_id, date_of_birth")
      .in("employee_id", teamIds)
      .is("deleted_at", null),
    fromHrms(supabase, "performance_reviews")
      .select("id, review_status")
      .eq("organization_id", organizationId)
      .in("employee_id", teamIds)
      .is("deleted_at", null),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message);
  if (attendanceResult.error) throw new Error(attendanceResult.error.message);
  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (reviewsResult.error) throw new Error(reviewsResult.error.message);

  let presentToday = 0;
  let onLeaveToday = 0;
  let markedToday = 0;

  for (const row of attendanceResult.data ?? []) {
    markedToday += 1;
    switch (row.attendance_status) {
      case "present":
      case "half_day":
      case "late":
        presentToday += 1;
        break;
      case "on_leave":
        onLeaveToday += 1;
        break;
      default:
        break;
    }
  }

  const probationEmployees = (employeesResult.data ?? []).filter(
    (row) => row.employment_status === "probation",
  ).length;

  const profileDobByEmployee = new Map<string, string>();
  for (const row of profilesResult.data ?? []) {
    if (row.employee_id && row.date_of_birth) {
      profileDobByEmployee.set(row.employee_id, row.date_of_birth);
    }
  }

  let upcomingBirthdays = 0;
  for (const employeeId of teamIds) {
    const dateOfBirth = profileDobByEmployee.get(employeeId);
    if (nextBirthdayWithinDays(dateOfBirth, todayDate, 7)) {
      upcomingBirthdays += 1;
    }
  }

  const reviews = reviewsResult.data ?? [];
  const completedReviews = (reviewsResult.data ?? []).filter(
    (row: { review_status: string }) =>
      row.review_status === "approved" || row.review_status === "submitted",
  ).length;
  const teamCompletionRate =
    reviews.length > 0
      ? Math.round((completedReviews / reviews.length) * 100)
      : markedToday > 0
        ? Math.round((markedToday / teamIds.length) * 100)
        : 0;

  return {
    totalTeamMembers: teamIds.length,
    presentToday,
    onLeaveToday,
    probationEmployees,
    upcomingBirthdays,
    teamCompletionRate,
  };
}

export async function getTeamFilterLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
  teamIds: string[],
): Promise<TeamFilterLookups> {
  if (teamIds.length === 0) {
    return { departments: [], designations: [], employmentTypes: [] };
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        department_id,
        designation_id,
        employment_type_id,
        departments:department_id (id, name, code),
        designations:designation_id (id, title),
        employment_types:employment_type_id (id, name)
      `,
    )
    .eq("organization_id", organizationId)
    .in("id", teamIds)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const departments = new Map<string, { id: string; label: string; code?: string }>();
  const designations = new Map<string, { id: string; label: string }>();
  const employmentTypes = new Map<string, { id: string; label: string }>();

  for (const row of data ?? []) {
    const department = unwrap(row.departments);
    const designation = unwrap(row.designations);
    const employmentType = unwrap(row.employment_types);

    if (department?.id) {
      departments.set(department.id, {
        id: department.id,
        label: department.name,
        code: department.code,
      });
    }
    if (designation?.id) {
      designations.set(designation.id, {
        id: designation.id,
        label: designation.title,
      });
    }
    if (employmentType?.id) {
      employmentTypes.set(employmentType.id, {
        id: employmentType.id,
        label: employmentType.name,
      });
    }
  }

  const toSortedOptions = (
    map: Map<string, { id: string; label: string; code?: string }>,
  ) =>
    [...map.values()]
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((item) => ({
        id: item.id,
        label: item.label,
        code: item.code,
      }));

  return {
    departments: toSortedOptions(departments),
    designations: toSortedOptions(designations),
    employmentTypes: toSortedOptions(employmentTypes),
  };
}

export async function listTeamEmployees(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  teamIds: string[],
  params: TeamListParams,
): Promise<TeamListResult> {
  const {
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    departmentId,
    designationId,
    employmentStatus,
    employmentTypeId,
  } = parseParams(params);

  if (teamIds.length === 0) {
    return { data: [], total: 0, page, pageSize };
  }

  const organizationId = profile.employee.organizationId;
  const today = getTodayDateString();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("employees")
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
    .in("id", teamIds)
    .is("deleted_at", null);

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},employee_code.ilike.${term}`,
    );
  }

  if (departmentId) query = query.eq("department_id", departmentId);
  if (designationId) query = query.eq("designation_id", designationId);
  if (employmentStatus) query = query.eq("employment_status", employmentStatus);
  if (employmentTypeId) query = query.eq("employment_type_id", employmentTypeId);

  query = query.order(sortBy, { ascending: sortOrder === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];
  const pageEmployeeIds = rows.map((row) => row.id as string);

  const [attendanceResult, leaveBalancesResult] = await Promise.all([
    pageEmployeeIds.length
      ? supabase
          .schema("hrms")
          .from("attendance")
          .select("employee_id, attendance_status")
          .eq("organization_id", organizationId)
          .eq("attendance_date", today)
          .in("employee_id", pageEmployeeIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
    pageEmployeeIds.length
      ? supabase
          .schema("hrms")
          .from("leave_balances")
          .select("employee_id, balance_days")
          .in("employee_id", pageEmployeeIds)
          .eq("balance_year", CURRENT_YEAR)
          .is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (attendanceResult.error) throw new Error(attendanceResult.error.message);
  if (leaveBalancesResult.error) throw new Error(leaveBalancesResult.error.message);

  const attendanceByEmployee = new Map<string, string>();
  for (const row of attendanceResult.data ?? []) {
    attendanceByEmployee.set(row.employee_id, row.attendance_status);
  }

  const leaveBalanceByEmployee = new Map<string, number>();
  for (const row of leaveBalancesResult.data ?? []) {
    const current = leaveBalanceByEmployee.get(row.employee_id) ?? 0;
    leaveBalanceByEmployee.set(
      row.employee_id,
      current + Number(row.balance_days ?? 0),
    );
  }

  return {
    data: rows.map((row): TeamMemberListItem => {
      const branch = unwrap(row.branches);
      const department = unwrap(row.departments);
      const designation = unwrap(row.designations);
      const employmentType = unwrap(row.employment_types);
      const manager = unwrap(row.manager);
      const employeeProfile = unwrap(row.employee_profiles);
      const employmentStatusValue = row.employment_status as TeamMemberListItem["employmentStatus"];

      return {
        id: row.id,
        employeeCode: row.employee_code,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: `${row.first_name} ${row.last_name}`,
        email: row.email,
        phone: row.phone,
        employmentStatus: employmentStatusValue,
        dateOfJoining: row.date_of_joining,
        departmentId: row.department_id,
        departmentName: department?.name ?? null,
        designationId: row.designation_id,
        designationTitle: designation?.title ?? null,
        employmentTypeId: row.employment_type_id,
        employmentTypeName: employmentType?.name ?? null,
        branchId: row.branch_id,
        branchName: branch?.name ?? null,
        workLocationName: branch?.name ?? null,
        reportingManagerId: row.reporting_manager_id,
        managerName: manager
          ? `${manager.first_name} ${manager.last_name}`
          : null,
        profileImagePath: employeeProfile?.profile_image_storage_path ?? null,
        attendanceToday: attendanceByEmployee.get(row.id) ?? null,
        leaveBalanceDays: leaveBalanceByEmployee.get(row.id) ?? 0,
        currentStatus:
          EMPLOYMENT_STATUS_LABELS[employmentStatusValue] ?? employmentStatusValue,
      };
    }),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getTeamMemberOptions(
  supabase: AuthSupabaseClient,
  organizationId: string,
  teamIds: string[],
) {
  if (teamIds.length === 0) return [];

  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, first_name, last_name, employee_code")
    .eq("organization_id", organizationId)
    .in("id", teamIds)
    .in("employment_status", [...ACTIVE_EMPLOYMENT])
    .is("deleted_at", null)
    .order("first_name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    label: `${row.first_name} ${row.last_name}`,
    code: row.employee_code,
  }));
}

export async function getTeamDesignationOptions(
  supabase: AuthSupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("designations")
    .select("id, title")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active")
    .order("title");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.title,
  }));
}

export function findHierarchyNodeById(
  node: HierarchyNode,
  employeeId: string,
): HierarchyNode | null {
  if (node.id === employeeId) return node;
  for (const child of node.children) {
    const found = findHierarchyNodeById(child, employeeId);
    if (found) return found;
  }
  return null;
}

export { buildHierarchyTree };
