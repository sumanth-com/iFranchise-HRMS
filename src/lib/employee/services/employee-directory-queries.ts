import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { fromHrms, unwrapRelation } from "@/lib/reports/services/reports-utils";
import type { UserProfile } from "@/types/auth";
import type { EmployeeDirectoryPerson } from "@/types/employee-directory";

const ACTIVE_STATUSES = new Set(["active", "probation", "on_leave"]);

type LooseRow = Record<string, unknown>;

export async function listEmployeeDirectory(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<EmployeeDirectoryPerson[]> {
  const organizationId = profile.employee.organizationId;

  const { data, error } = await fromHrms(supabase, "employees")
    .select(
      `
        id,
        employee_code,
        first_name,
        last_name,
        department_id,
        employment_status,
        departments:department_id (name),
        designations:designation_id (title),
        branches:branch_id (name),
        employee_profiles (profile_image_storage_path)
      `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .in("employment_status", [...ACTIVE_STATUSES])
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];

  return rows.map((row): EmployeeDirectoryPerson => {
    const department = unwrapRelation(row.departments) as { name?: string } | null;
    const designation = unwrapRelation(row.designations) as { title?: string } | null;
    const branch = unwrapRelation(row.branches) as { name?: string } | null;
    const employeeProfile = unwrapRelation(row.employee_profiles) as {
      profile_image_storage_path?: string | null;
    } | null;

    const firstName = row.first_name as string;
    const lastName = row.last_name as string;
    const imagePath = employeeProfile?.profile_image_storage_path ?? null;

    return {
      id: row.id as string,
      employeeCode: row.employee_code as string,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      designationTitle: designation?.title ?? null,
      departmentId: (row.department_id as string | null) ?? null,
      departmentName: department?.name ?? null,
      verticalName: branch?.name ?? null,
      avatarUrl: null,
      profileImagePath: imagePath,
    };
  });
}
