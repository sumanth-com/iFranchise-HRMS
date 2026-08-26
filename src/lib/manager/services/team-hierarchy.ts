import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { HierarchyEmployee } from "@/types/organization";

export type TeamMemberSummary = {
  id: string;
  employeeCode: string;
  fullName: string;
  departmentName: string | null;
  designationTitle: string | null;
};

type HierarchyEmployeeRow = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  reporting_manager_id: string | null;
  designations: { title: string } | { title: string }[] | null;
  departments: { name: string } | { name: string }[] | null;
};

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapHierarchyRow(row: HierarchyEmployeeRow): HierarchyEmployee {
  const designation = unwrapRelation(row.designations);
  const department = unwrapRelation(row.departments);
  return {
    id: row.id,
    employeeCode: row.employee_code,
    fullName: `${row.first_name} ${row.last_name}`,
    designationTitle: designation?.title ?? null,
    departmentName: department?.name ?? null,
    reportingManagerId: row.reporting_manager_id,
  };
}

const HIERARCHY_SELECT = `
  id, employee_code, first_name, last_name, reporting_manager_id,
  designations:designation_id (title),
  departments:department_id (name)
`;

/**
 * In-memory BFS over an already-loaded hierarchy list.
 * Kept for org-wide hierarchy UIs that still need the full org dataset.
 */
export function collectDescendantIds(
  managerId: string,
  employees: HierarchyEmployee[],
): string[] {
  const childrenByManager = new Map<string, string[]>();

  for (const employee of employees) {
    if (!employee.reportingManagerId) continue;
    const siblings = childrenByManager.get(employee.reportingManagerId) ?? [];
    siblings.push(employee.id);
    childrenByManager.set(employee.reportingManagerId, siblings);
  }

  const descendantIds: string[] = [];
  const queue = [...(childrenByManager.get(managerId) ?? [])];

  while (queue.length > 0) {
    const employeeId = queue.shift();
    if (!employeeId) continue;
    descendantIds.push(employeeId);
    queue.push(...(childrenByManager.get(employeeId) ?? []));
  }

  return descendantIds;
}

/**
 * Load only the manager's reporting subtree via level-by-level queries.
 * Avoids downloading the full organization roster for manager team scope.
 */
async function listManagerSubtreeEmployees(
  supabase: AuthSupabaseClient,
  organizationId: string,
  managerEmployeeId: string,
): Promise<{ manager: HierarchyEmployee | null; descendants: HierarchyEmployee[] }> {
  const { data: managerRow, error: managerError } = await supabase
    .schema("hrms")
    .from("employees")
    .select(HIERARCHY_SELECT)
    .eq("organization_id", organizationId)
    .eq("id", managerEmployeeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (managerError) throw new Error(managerError.message);

  const manager = managerRow
    ? mapHierarchyRow(managerRow as HierarchyEmployeeRow)
    : null;

  const descendants: HierarchyEmployee[] = [];
  const visited = new Set<string>([managerEmployeeId]);
  let frontier = [managerEmployeeId];

  while (frontier.length > 0) {
    const { data, error } = await supabase
      .schema("hrms")
      .from("employees")
      .select(HIERARCHY_SELECT)
      .eq("organization_id", organizationId)
      .in("reporting_manager_id", frontier)
      .is("deleted_at", null)
      .in("employment_status", ["active", "probation", "on_leave"])
      .order("first_name");

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as HierarchyEmployeeRow[];
    if (rows.length === 0) break;

    const nextFrontier: string[] = [];
    for (const row of rows) {
      if (visited.has(row.id)) continue;
      visited.add(row.id);
      const mapped = mapHierarchyRow(row);
      descendants.push(mapped);
      nextFrontier.push(row.id);
    }
    frontier = nextFrontier;
  }

  return { manager, descendants };
}

export async function getManagerTeamContext(
  supabase: AuthSupabaseClient,
  organizationId: string,
  managerEmployeeId: string,
) {
  const { manager, descendants } = await listManagerSubtreeEmployees(
    supabase,
    organizationId,
    managerEmployeeId,
  );

  const teamIds = descendants.map((employee) => employee.id);
  const teamMembers: TeamMemberSummary[] = descendants.map((employee) => ({
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    departmentName: employee.departmentName,
    designationTitle: employee.designationTitle,
  }));

  // Only manager + descendants — enough for team tree UIs, not the full org.
  const hierarchyEmployees: HierarchyEmployee[] = manager
    ? [manager, ...descendants]
    : descendants;

  return { teamIds, teamMembers, hierarchyEmployees };
}
