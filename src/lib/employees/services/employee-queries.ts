import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { allocateNextEmployeeCode } from "@/lib/employees/services/employee-code";
import type { UserProfile } from "@/types/auth";
import type {
  EmployeeAccountProvisioningItem,
  EmployeeAccountProvisioningSummary,
  EmployeeListParams,
  EmployeeListResult,
  EmployeeSortField,
  LookupOption,
} from "@/types/employee";
import { employeeListParamsSchema } from "@/lib/validations/employee";

type EmployeeRow = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  employment_status: string;
  date_of_joining: string | null;
  branch_id: string;
  department_id: string | null;
  designation_id: string | null;
  account_status: string;
  invitation_sent_at: string | null;
  last_login_at: string | null;
  branches: { name: string } | { name: string }[] | null;
  departments: { name: string } | { name: string }[] | null;
  designations: { title: string } | { title: string }[] | null;
  employee_profiles:
    | { profile_image_storage_path: string | null }
    | { profile_image_storage_path: string | null }[]
    | null;
};

type EmployeeAccountProvisioningRow = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  account_status: EmployeeAccountProvisioningItem["accountStatus"];
  invitation_sent_at: string | null;
  last_login_at: string | null;
};

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseListParams(params: EmployeeListParams) {
  return employeeListParamsSchema.parse(params);
}

export async function listEmployees(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: EmployeeListParams,
): Promise<EmployeeListResult> {
  const {
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    department,
    employmentStatus,
    accountStatus,
  } = parseListParams(params);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let departmentId: string | undefined;
  if (department) {
    const { data: departmentRow, error: departmentError } = await supabase
      .schema("hrms")
      .from("departments")
      .select("id")
      .eq("organization_id", profile.employee.organizationId)
      .ilike("code", department)
      .is("deleted_at", null)
      .maybeSingle();

    if (departmentError) {
      throw new Error(departmentError.message);
    }

    if (!departmentRow?.id) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
      };
    }

    departmentId = departmentRow.id;
  }

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
        account_status,
        invitation_sent_at,
        last_login_at,
        branches:branch_id (name),
        departments:department_id (name),
        designations:designation_id (title),
        employee_profiles (profile_image_storage_path)
      `,
      { count: "exact" },
    )
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},employee_code.ilike.${term}`,
    );
  }

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  if (employmentStatus) {
    query = query.eq("employment_status", employmentStatus);
  }

  if (accountStatus) {
    query = query.eq("account_status", accountStatus);
  }

  const sortColumn = sortBy as EmployeeSortField;
  query = query.order(sortColumn, { ascending: sortOrder === "asc" });
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as EmployeeRow[];

  return {
    data: rows.map((row) => {
      const branch = unwrapRelation(row.branches);
      const department = unwrapRelation(row.departments);
      const designation = unwrapRelation(row.designations);
      const employeeProfile = unwrapRelation(row.employee_profiles);

      return {
        id: row.id,
        employeeCode: row.employee_code,
        firstName: row.first_name,
        lastName: row.last_name,
        fullName: `${row.first_name} ${row.last_name}`,
        email: row.email,
        phone: row.phone,
        employmentStatus: row.employment_status as EmployeeListResult["data"][number]["employmentStatus"],
        dateOfJoining: row.date_of_joining,
        branchId: row.branch_id,
        branchName: branch?.name ?? null,
        departmentId: row.department_id,
        departmentName: department?.name ?? null,
        designationId: row.designation_id,
        designationTitle: designation?.title ?? null,
        profileImagePath: employeeProfile?.profile_image_storage_path ?? null,
        accountStatus: row.account_status as EmployeeListResult["data"][number]["accountStatus"],
        invitationSentAt: row.invitation_sent_at,
        lastLoginAt: row.last_login_at,
      };
    }),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function suggestNextEmployeeCode(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<string> {
  void supabase;
  return allocateNextEmployeeCode(organizationId);
}

function mapProvisioningItem(
  row: EmployeeAccountProvisioningRow,
): EmployeeAccountProvisioningItem {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    fullName: `${row.first_name} ${row.last_name}`,
    email: row.email,
    accountStatus: row.account_status,
    invitationSentAt: row.invitation_sent_at,
    lastLoginAt: row.last_login_at,
  };
}

export async function getEmployeeAccountProvisioningSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<EmployeeAccountProvisioningSummary> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      "id, employee_code, first_name, last_name, email, account_status, invitation_sent_at, last_login_at",
    )
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as EmployeeAccountProvisioningRow[];
  const counts = {
    draft: 0,
    invited: 0,
    invitationPending: 0,
    invitationAccepted: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    archived: 0,
  };

  for (const row of rows) {
    if (row.account_status === "invitation_pending") counts.invitationPending += 1;
    else if (row.account_status === "invitation_accepted") counts.invitationAccepted += 1;
    else if (row.account_status in counts) counts[row.account_status as keyof typeof counts] += 1;
  }

  return {
    ...counts,
    readyToInvite: rows
      .filter((row) => row.account_status === "draft" || row.account_status === "invited")
      .slice(0, 5)
      .map(mapProvisioningItem),
    pendingInvitations: rows
      .filter((row) => row.account_status === "invitation_pending")
      .slice(0, 5)
      .map(mapProvisioningItem),
    suspendedAccounts: rows
      .filter((row) => row.account_status === "suspended")
      .slice(0, 5)
      .map(mapProvisioningItem),
  };
}

export {
  getBranches,
  getDepartments,
  getDesignations,
  getEmploymentTypes,
} from "@/lib/organization/services/org-lookups";

export async function getManagers(
  supabase: AuthSupabaseClient,
  organizationId: string,
  excludeEmployeeId?: string,
): Promise<LookupOption[]> {
  let query = supabase
    .schema("hrms")
    .from("employees")
    .select("id, first_name, last_name, employee_code")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .in("employment_status", ["active", "probation", "on_leave"])
    .order("first_name");

  if (excludeEmployeeId) {
    query = query.neq("id", excludeEmployeeId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    label: `${row.first_name} ${row.last_name}`,
    code: row.employee_code,
  }));
}

export async function getDocumentTypes(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("document_types")
    .select("id, name, code")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active")
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.name,
    code: row.code,
  }));
}

export async function getEmployeeLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
  excludeEmployeeId?: string,
) {
  const { getOrganizationLookups } = await import("@/lib/organization/services/org-lookups");
  const [orgLookups, managers, documentTypes] = await Promise.all([
    getOrganizationLookups(supabase, organizationId, excludeEmployeeId),
    getManagers(supabase, organizationId, excludeEmployeeId),
    getDocumentTypes(supabase, organizationId),
  ]);

  return {
    branches: orgLookups.branches,
    departments: orgLookups.departments,
    designations: orgLookups.designations,
    employmentTypes: orgLookups.employmentTypes,
    managers,
    documentTypes,
  };
}
