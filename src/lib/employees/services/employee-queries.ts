import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { allocateNextEmployeeCode } from "@/lib/employees/services/employee-code";
import { cleanDisplayText } from "@/lib/employees/parse-employee-name";
import {
  resolveOrgDataEmployeeScope,
  scopedEmployeeIds,
} from "@/lib/manager/portal-scope";
import { listEligibleHrLeaveApproverOptions } from "@/lib/leave/services/leave-queries";
import { getDepartments } from "@/lib/organization/services/org-lookups";
import {
  DIRECTORY_HIDDEN_EMPLOYEE_CODES,
  isHiddenFromPeopleFilters,
} from "@/lib/employee/directory-listing";
import {
  employmentCategoryTypeCodes,
  type EmploymentCategoryFilter,
} from "@/lib/employees/employment-category";
import {
  filterStandardEmploymentTypes,
  normalizeStandardEmploymentTypeCode,
} from "@/lib/employees/standard-employment-types";
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
  employment_type_id?: string | null;
  employment_status?: string | null;
  account_status: string;
  designations: { title: string } | { title: string }[] | null;
  employment_types: { name: string; code: string } | { name: string; code: string }[] | null;
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

async function applyEmploymentCategoryFilter(
  supabase: AuthSupabaseClient,
  organizationId: string,
  category: EmploymentCategoryFilter | undefined,
) {
  if (!category || category === "all") {
    return null;
  }

  const { data: types, error } = await supabase
    .schema("hrms")
    .from("employment_types")
    .select("id, code")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const activeTypes = types ?? [];
  const allowedCodes = new Set(employmentCategoryTypeCodes(category));
  const matchingTypeIds = activeTypes
    .filter((type) => {
      const normalized = normalizeStandardEmploymentTypeCode(type.code);
      return normalized !== null && allowedCodes.has(normalized);
    })
    .map((type) => type.id);

  if (category === "full_time") {
    return { mode: "full_time" as const, typeIds: [...new Set(matchingTypeIds)] };
  }

  return { mode: "probation" as const, typeIds: [...new Set(matchingTypeIds)] };
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
    employmentCategory,
  } = parseListParams(params);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const categoryFilter = await applyEmploymentCategoryFilter(
    supabase,
    profile.employee.organizationId,
    employmentCategory,
  );

  if (categoryFilter && categoryFilter.typeIds.length === 0) {
    return { data: [], total: 0, page, pageSize };
  }

  const employeeScope = await resolveOrgDataEmployeeScope(supabase, profile);
  const scopedIds = scopedEmployeeIds(employeeScope);
  if (scopedIds && scopedIds.length === 0) {
    return { data: [], total: 0, page, pageSize };
  }

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
        employment_type_id,
        employment_status,
        account_status,
        designations:designation_id (title),
        employment_types:employment_type_id (name, code),
        employee_profiles (profile_image_storage_path)
      `,
      { count: "estimated" },
    )
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .is("app_hidden_at", null);

  if (scopedIds) {
    query = query.in("id", scopedIds);
  }

  const hiddenCodes = [...DIRECTORY_HIDDEN_EMPLOYEE_CODES];
  if (hiddenCodes.length > 0) {
    query = query.not("employee_code", "in", `(${hiddenCodes.join(",")})`);
  }

  if (search) {
    const escaped = search.replace(/[%_,.()\"\\]/g, " ").trim();
    if (escaped) {
      const term = `%${escaped}%`;
      query = query.or(
        [
          `first_name.ilike."${term}"`,
          `last_name.ilike."${term}"`,
          `email.ilike."${term}"`,
          `employee_code.ilike."${term}"`,
        ].join(","),
      );
    }
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

  if (categoryFilter && categoryFilter.typeIds.length > 0) {
    query = query.in("employment_type_id", categoryFilter.typeIds);
  }

  const sortColumn = sortBy as EmployeeSortField;
  query = query.order(sortColumn, { ascending: sortOrder === "asc" });
  if (sortColumn === "first_name") {
    query = query.order("last_name", { ascending: sortOrder === "asc" });
  }
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as EmployeeRow[]).filter(
    (row) =>
      !isHiddenFromPeopleFilters(row.employee_code, {
        employeeCode: row.employee_code,
        firstName: row.first_name,
        lastName: row.last_name,
        designationTitle: unwrapRelation(row.designations)?.title,
      }),
  );
  // Defer avatar signing to the client CardPhoto path — do not block the list
  // round-trip on storage signed-URL generation for every card.

  return {
    data: rows.map((row) => {
      const designation = unwrapRelation(row.designations);
      const employmentType = unwrapRelation(row.employment_types);
      const employeeProfile = unwrapRelation(row.employee_profiles);
      const profileImagePath = employeeProfile?.profile_image_storage_path ?? null;

      return {
        id: row.id,
        employeeCode: row.employee_code,
        firstName: cleanDisplayText(row.first_name),
        lastName: cleanDisplayText(row.last_name),
        fullName: `${cleanDisplayText(row.first_name)} ${cleanDisplayText(row.last_name)}`.trim(),
        email: "",
        phone: null,
        employmentStatus: (row.employment_status ??
          "active") as EmployeeListResult["data"][number]["employmentStatus"],
        dateOfJoining: null,
        branchId: "",
        branchName: null,
        departmentId: null,
        departmentName: null,
        designationId: null,
        designationTitle: designation?.title ?? null,
        employmentTypeName: employmentType?.name ?? null,
        employmentTypeId: row.employment_type_id ?? null,
        employmentTypeCode: employmentType?.code ?? null,
        profileImagePath,
        profileImageSignedUrl: null,
        accountStatus: row.account_status as EmployeeListResult["data"][number]["accountStatus"],
        invitationSentAt: null,
        lastLoginAt: null,
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
  const organizationId = profile.employee.organizationId;
  const base = () =>
    supabase
      .schema("hrms")
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("app_hidden_at", null);

  const previewSelect =
    "id, employee_code, first_name, last_name, email, account_status, invitation_sent_at, last_login_at";

  const [
    draftCount,
    invitedCount,
    invitationPendingCount,
    invitationAcceptedCount,
    activeCount,
    inactiveCount,
    suspendedCount,
    archivedCount,
    readyToInviteResult,
    pendingInvitationsResult,
    suspendedAccountsResult,
  ] = await Promise.all([
    base().eq("account_status", "draft"),
    base().eq("account_status", "invited"),
    base().eq("account_status", "invitation_pending"),
    base().eq("account_status", "invitation_accepted"),
    base().eq("account_status", "active"),
    base().eq("account_status", "inactive"),
    base().eq("account_status", "suspended"),
    base().eq("account_status", "archived"),
    supabase
      .schema("hrms")
      .from("employees")
      .select(previewSelect)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("app_hidden_at", null)
      .in("account_status", ["draft", "invited"])
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .schema("hrms")
      .from("employees")
      .select(previewSelect)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("app_hidden_at", null)
      .eq("account_status", "invitation_pending")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .schema("hrms")
      .from("employees")
      .select(previewSelect)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("app_hidden_at", null)
      .eq("account_status", "suspended")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const countErrors = [
    draftCount,
    invitedCount,
    invitationPendingCount,
    invitationAcceptedCount,
    activeCount,
    inactiveCount,
    suspendedCount,
    archivedCount,
    readyToInviteResult,
    pendingInvitationsResult,
    suspendedAccountsResult,
  ].find((result) => result.error);

  if (countErrors?.error) {
    throw new Error(countErrors.error.message);
  }

  return {
    draft: draftCount.count ?? 0,
    invited: invitedCount.count ?? 0,
    invitationPending: invitationPendingCount.count ?? 0,
    invitationAccepted: invitationAcceptedCount.count ?? 0,
    active: activeCount.count ?? 0,
    inactive: inactiveCount.count ?? 0,
    suspended: suspendedCount.count ?? 0,
    archived: archivedCount.count ?? 0,
    readyToInvite: ((readyToInviteResult.data ?? []) as EmployeeAccountProvisioningRow[]).map(
      mapProvisioningItem,
    ),
    pendingInvitations: (
      (pendingInvitationsResult.data ?? []) as EmployeeAccountProvisioningRow[]
    ).map(mapProvisioningItem),
    suspendedAccounts: (
      (suspendedAccountsResult.data ?? []) as EmployeeAccountProvisioningRow[]
    ).map(mapProvisioningItem),
  };
}

export {
  getBranches,
  getDepartments,
  getDesignations,
  getEmploymentTypes,
} from "@/lib/organization/services/org-lookups";

/** Active org departments that currently have at least one employee assigned. */
export async function getOccupiedDepartments(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<LookupOption[]> {
  const [departments, occupied] = await Promise.all([
    getDepartments(supabase, organizationId),
    supabase
      .schema("hrms")
      .from("employees")
      .select(
        "department_id, employee_code, first_name, last_name, designations:designation_id (title)",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("app_hidden_at", null)
      .not("department_id", "is", null),
  ]);

  if (occupied.error) throw new Error(occupied.error.message);

  const usedIds = new Set(
    (occupied.data ?? [])
      .filter((row) => {
        const designation = unwrapRelation(
          row.designations as { title: string } | { title: string }[] | null,
        );
        return !isHiddenFromPeopleFilters(row.employee_code, {
          employeeCode: row.employee_code,
          firstName: row.first_name,
          lastName: row.last_name,
          designationTitle: designation?.title ?? null,
        });
      })
      .map((row) => row.department_id as string | null)
      .filter((id): id is string => Boolean(id)),
  );

  return departments.filter((item) => usedIds.has(item.id) && Boolean(item.code?.trim()));
}

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
    .is("app_hidden_at", null)
    .in("employment_status", ["active", "probation", "on_leave"])
    .order("first_name");

  if (excludeEmployeeId) {
    query = query.neq("id", excludeEmployeeId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter(
      (row) =>
        !isHiddenFromPeopleFilters(row.employee_code, {
          employeeCode: row.employee_code,
          firstName: row.first_name,
          lastName: row.last_name,
        }),
    )
    .map((row) => ({
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
  const [orgLookups, managers, documentTypes, hrApprovers] = await Promise.all([
    getOrganizationLookups(supabase, organizationId, excludeEmployeeId),
    getManagers(supabase, organizationId, excludeEmployeeId),
    getDocumentTypes(supabase, organizationId),
    listEligibleHrLeaveApproverOptions(organizationId, excludeEmployeeId),
  ]);

  return {
    branches: orgLookups.branches,
    departments: orgLookups.departments,
    designations: orgLookups.designations,
    employmentTypes: filterStandardEmploymentTypes(orgLookups.employmentTypes),
    managers,
    hrApprovers,
    documentTypes,
  };
}
