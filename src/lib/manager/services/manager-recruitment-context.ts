import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { ManagerRecruitmentContext } from "@/types/manager-recruitment";

export async function getManagerRecruitmentDepartmentIds(
  supabase: AuthSupabaseClient,
  organizationId: string,
  managerId: string,
): Promise<string[]> {
  const [headDepartmentsResult, managerRowResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("departments")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("department_head_id", managerId)
      .is("deleted_at", null)
      .eq("status", "active"),
    supabase
      .schema("hrms")
      .from("employees")
      .select("department_id")
      .eq("id", managerId)
      .maybeSingle(),
  ]);

  if (headDepartmentsResult.error) throw new Error(headDepartmentsResult.error.message);
  if (managerRowResult.error) throw new Error(managerRowResult.error.message);

  const departmentIds = new Set<string>();
  for (const row of headDepartmentsResult.data ?? []) {
    if (row.id) departmentIds.add(row.id);
  }
  if (managerRowResult.data?.department_id) {
    departmentIds.add(managerRowResult.data.department_id);
  }

  return [...departmentIds];
}

export async function getManagerRecruitmentContext(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<ManagerRecruitmentContext> {
  const managerId = profile.employee.id;
  const organizationId = profile.employee.organizationId;
  const departmentIds = await getManagerRecruitmentDepartmentIds(
    supabase,
    organizationId,
    managerId,
  );

  return { managerId, organizationId, departmentIds };
}

export function assertRecruitmentDepartmentAccess(
  departmentIds: string[],
  departmentId: string | null | undefined,
) {
  if (!departmentId || !departmentIds.includes(departmentId)) {
    throw new Error("You can only access recruitment data for departments you manage.");
  }
}
