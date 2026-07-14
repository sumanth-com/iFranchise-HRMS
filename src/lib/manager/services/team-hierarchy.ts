import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { listHierarchyEmployees } from "@/lib/organization/services/org-queries";
import type { HierarchyEmployee } from "@/types/organization";

export type TeamMemberSummary = {
  id: string;
  employeeCode: string;
  fullName: string;
  departmentName: string | null;
  designationTitle: string | null;
};

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

export async function getManagerTeamContext(
  supabase: AuthSupabaseClient,
  organizationId: string,
  managerEmployeeId: string,
) {
  const hierarchyEmployees = await listHierarchyEmployees(supabase, organizationId);
  const teamIds = collectDescendantIds(managerEmployeeId, hierarchyEmployees);
  const teamMembers: TeamMemberSummary[] = hierarchyEmployees
    .filter((employee) => teamIds.includes(employee.id))
    .map((employee) => ({
      id: employee.id,
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      departmentName: employee.departmentName,
      designationTitle: employee.designationTitle,
    }));

  return { teamIds, teamMembers, hierarchyEmployees };
}
