import { differenceInMonths } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { createSignedStorageUrl } from "@/lib/employees/services/employee-mutations";
import { fromHrms, unwrapRelation } from "@/lib/reports/services/reports-utils";
import type { UserProfile } from "@/types/auth";
import type { EmployeeDirectoryPerson } from "@/types/employee-directory";

const ACTIVE_STATUSES = new Set(["active", "probation", "on_leave"]);

type LooseRow = Record<string, unknown>;

function experienceYearsFromJoining(dateOfJoining: string | null | undefined): number | null {
  if (!dateOfJoining) return null;
  const months = differenceInMonths(new Date(), new Date(dateOfJoining));
  if (months < 0) return 0;
  return Math.round((months / 12) * 10) / 10;
}

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
        email,
        phone,
        employment_status,
        date_of_joining,
        departments:department_id (name),
        designations:designation_id (title),
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

  return Promise.all(
    rows.map(async (row): Promise<EmployeeDirectoryPerson> => {
      const department = unwrapRelation(row.departments) as { name?: string } | null;
      const designation = unwrapRelation(row.designations) as { title?: string } | null;
      const employeeProfile = unwrapRelation(row.employee_profiles) as {
        profile_image_storage_path?: string | null;
      } | null;

      const imagePath = employeeProfile?.profile_image_storage_path ?? null;
      const avatarUrl = imagePath
        ? await createSignedStorageUrl(
            supabase,
            EMPLOYEE_STORAGE_BUCKETS.profileImages,
            imagePath,
          )
        : null;

      const firstName = row.first_name as string;
      const lastName = row.last_name as string;
      const designationTitle = designation?.title ?? null;
      const departmentName = department?.name ?? null;

      const dateOfJoining = (row.date_of_joining as string | null) ?? null;

      return {
        id: row.id as string,
        employeeCode: row.employee_code as string,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        email: row.email as string,
        phone: (row.phone as string | null) ?? null,
        designationTitle,
        departmentName,
        dateOfJoining,
        experienceYears: experienceYearsFromJoining(dateOfJoining),
        avatarUrl,
      };
    }),
  );
}
