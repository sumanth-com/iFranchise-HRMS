import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  DIRECTORY_INCLUDED_EMPLOYEE_CODES,
  DIRECTORY_INCLUDED_EMPLOYEE_EMAILS,
  directoryDesignationDisplay,
  isHiddenFromEmployeeDirectory,
} from "@/lib/employee/directory-listing";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { fromHrms, unwrapRelation } from "@/lib/reports/services/reports-utils";
import { createSignedStorageUrls } from "@/lib/storage/signed-url";
import type { UserProfile } from "@/types/auth";
import type { EmployeeDirectoryPerson } from "@/types/employee-directory";

const ACTIVE_STATUSES = new Set(["active", "probation", "on_leave"]);

const DIRECTORY_SELECT = `
  id,
  employee_code,
  first_name,
  last_name,
  email,
  department_id,
  employment_status,
  departments:department_id (name),
  designations:designation_id (title, code),
  branches:branch_id (name),
  employee_profiles (profile_image_storage_path)
`;

type LooseRow = Record<string, unknown>;

export type ListEmployeeDirectoryOptions = {
  /** Employee Portal listing only: hide placeholder people and include the existing personal profile row. */
  employeePortalListing?: boolean;
};

function mapDirectoryRows(
  rows: LooseRow[],
  signedByPath: Map<string, string>,
  options?: ListEmployeeDirectoryOptions,
): EmployeeDirectoryPerson[] {
  return rows.map((row): EmployeeDirectoryPerson => {
    const department = unwrapRelation(row.departments) as { name?: string } | null;
    const designation = unwrapRelation(row.designations) as {
      title?: string;
      code?: string;
    } | null;
    const branch = unwrapRelation(row.branches) as { name?: string } | null;
    const employeeProfile = unwrapRelation(row.employee_profiles) as {
      profile_image_storage_path?: string | null;
    } | null;

    const firstName = row.first_name as string;
    const lastName = row.last_name as string;
    const imagePath = employeeProfile?.profile_image_storage_path ?? null;
    const rawTitle = designation?.title ?? null;
    const designationTitle = options?.employeePortalListing
      ? directoryDesignationDisplay(rawTitle, designation?.code, {
          employeeCode: row.employee_code as string,
          firstName,
          lastName,
        })
      : rawTitle;

    return {
      id: row.id as string,
      employeeCode: row.employee_code as string,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      designationTitle,
      designationSearchText: [rawTitle, designationTitle].filter(Boolean).join(" ") || null,
      departmentId: (row.department_id as string | null) ?? null,
      departmentName: department?.name ?? null,
      verticalName: branch?.name ?? null,
      avatarUrl: imagePath ? (signedByPath.get(imagePath) ?? null) : null,
      profileImagePath: imagePath,
    };
  });
}

function mergeDirectoryRows(primary: LooseRow[], extra: LooseRow[]): LooseRow[] {
  const byId = new Map<string, LooseRow>();
  for (const row of primary) {
    byId.set(row.id as string, row);
  }
  for (const row of extra) {
    const id = row.id as string;
    if (!byId.has(id)) {
      byId.set(id, row);
    }
  }
  return [...byId.values()];
}

export async function listEmployeeDirectory(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  options?: ListEmployeeDirectoryOptions,
): Promise<EmployeeDirectoryPerson[]> {
  const organizationId = profile.employee.organizationId;

  const { data, error } = await fromHrms(supabase, "employees")
    .select(DIRECTORY_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .in("employment_status", [...ACTIVE_STATUSES])
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (error) throw new Error(error.message);

  let rows = (data ?? []) as LooseRow[];

  if (options?.employeePortalListing) {
    const includeFilters = [
      ...DIRECTORY_INCLUDED_EMPLOYEE_CODES.map((code) => `employee_code.eq.${code}`),
      ...DIRECTORY_INCLUDED_EMPLOYEE_EMAILS.map((email) => `email.eq.${email}`),
      'and(first_name.eq."Gangaram Sumanth",last_name.eq.Reddy)',
    ].join(",");

    const { data: extraData, error: extraError } = await fromHrms(supabase, "employees")
      .select(DIRECTORY_SELECT)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(includeFilters);

    if (extraError) throw new Error(extraError.message);

    const extraRows = ((extraData ?? []) as LooseRow[]).filter((row) => {
      const status = String(row.employment_status ?? "");
      return !["terminated", "resigned", "suspended"].includes(status);
    });

    rows = mergeDirectoryRows(rows, extraRows);

    rows.sort((a, b) => {
      const first = String(a.first_name ?? "").localeCompare(String(b.first_name ?? ""));
      if (first !== 0) return first;
      return String(a.last_name ?? "").localeCompare(String(b.last_name ?? ""));
    });
  }

  rows = rows.filter(
    (row) =>
      !isHiddenFromEmployeeDirectory(row.employee_code as string, {
        employeeCode: row.employee_code as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
      }),
  );

  const imagePaths = rows.map((row) => {
    const employeeProfile = unwrapRelation(row.employee_profiles) as {
      profile_image_storage_path?: string | null;
    } | null;
    return employeeProfile?.profile_image_storage_path ?? null;
  });
  const signedByPath = await createSignedStorageUrls(
    supabase,
    EMPLOYEE_STORAGE_BUCKETS.profileImages,
    imagePaths,
  );

  return mapDirectoryRows(rows, signedByPath, options);
}
