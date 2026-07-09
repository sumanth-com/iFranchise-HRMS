import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  BranchListResult,
  DepartmentListResult,
  DesignationListResult,
  EmploymentTypeListItem,
  HierarchyEmployee,
  HierarchyNode,
  HolidayListItem,
  HolidayListResult,
  OrgListParams,
  OrgSearchResult,
  OrganizationDashboardStats,
  OrganizationProfile,
  ShiftTemplateListItem,
  WorkLocationListResult,
} from "@/types/organization";
import { orgListParamsSchema, holidayListParamsSchema } from "@/lib/validations/organization";
import { unwrapRelation } from "@/lib/organization/services/org-lookups";

function parseListParams(params: OrgListParams) {
  return orgListParamsSchema.parse(params);
}

export async function getOrganizationProfile(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<OrganizationProfile | null> {
  const { data: org, error } = await supabase
    .schema("hrms")
    .from("organizations")
    .select(
      `id, name, legal_name, email, phone, website, logo_storage_path,
       gst_number, pan_number, cin,
       registered_address_line1, registered_address_line2, registered_city, registered_state,
       registered_country, registered_postal_code,
       corporate_address_line1, corporate_address_line2, corporate_city, corporate_state,
       corporate_country, corporate_postal_code, status`,
    )
    .eq("id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!org) return null;

  const { data: settings } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("timezone, currency_code, date_format, fiscal_year_start_month")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  return {
    id: org.id,
    name: org.name,
    legalName: org.legal_name,
    email: org.email,
    phone: org.phone,
    website: org.website,
    logoStoragePath: org.logo_storage_path,
    gstNumber: org.gst_number,
    panNumber: org.pan_number,
    cin: org.cin,
    registeredAddressLine1: org.registered_address_line1,
    registeredAddressLine2: org.registered_address_line2,
    registeredCity: org.registered_city,
    registeredState: org.registered_state,
    registeredCountry: org.registered_country,
    registeredPostalCode: org.registered_postal_code,
    corporateAddressLine1: org.corporate_address_line1,
    corporateAddressLine2: org.corporate_address_line2,
    corporateCity: org.corporate_city,
    corporateState: org.corporate_state,
    corporateCountry: org.corporate_country,
    corporatePostalCode: org.corporate_postal_code,
    timezone: settings?.timezone ?? "UTC",
    currencyCode: settings?.currency_code ?? "INR",
    dateFormat: settings?.date_format ?? "DD/MM/YYYY",
    fiscalYearStartMonth: settings?.fiscal_year_start_month ?? 4,
    status: org.status,
  };
}

async function countEmployees(
  supabase: AuthSupabaseClient,
  organizationId: string,
  filter: { branchId?: string; departmentId?: string; designationId?: string; employmentTypeId?: string },
) {
  let query = supabase
    .schema("hrms")
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (filter.branchId) query = query.eq("branch_id", filter.branchId);
  if (filter.departmentId) query = query.eq("department_id", filter.departmentId);
  if (filter.designationId) query = query.eq("designation_id", filter.designationId);
  if (filter.employmentTypeId) query = query.eq("employment_type_id", filter.employmentTypeId);

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getOrganizationDashboardStats(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<OrganizationDashboardStats> {
  const orgId = profile.employee.organizationId;

  const countTable = async (table: string) => {
    const { count, error } = await supabase
      .schema("hrms")
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .eq("status", "active");
    if (error) throw new Error(error.message);
    return count ?? 0;
  };

  const [branches, departments, designations, workLocations, holidays, shiftTemplates, employmentTypes] =
    await Promise.all([
      countTable("branches"),
      countTable("departments"),
      countTable("designations"),
      countTable("work_locations"),
      countTable("holidays"),
      countTable("shift_templates"),
      countTable("employment_types"),
    ]);

  const { data: deptEmployees } = await supabase
    .schema("hrms")
    .from("employees")
    .select("department_id, departments:department_id (name)")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .not("department_id", "is", null);

  const deptMap = new Map<string, { name: string; count: number }>();
  for (const row of deptEmployees ?? []) {
    const dept = unwrapRelation(row.departments as { name: string } | { name: string }[] | null);
    if (!row.department_id || !dept) continue;
    const existing = deptMap.get(row.department_id);
    if (existing) existing.count += 1;
    else deptMap.set(row.department_id, { name: dept.name, count: 1 });
  }

  const { data: branchEmployees } = await supabase
    .schema("hrms")
    .from("employees")
    .select("branch_id, branches:branch_id (name)")
    .eq("organization_id", orgId)
    .is("deleted_at", null);

  const branchMap = new Map<string, { name: string; count: number }>();
  for (const row of branchEmployees ?? []) {
    const branch = unwrapRelation(row.branches as { name: string } | { name: string }[] | null);
    if (!row.branch_id || !branch) continue;
    const existing = branchMap.get(row.branch_id);
    if (existing) existing.count += 1;
    else branchMap.set(row.branch_id, { name: branch.name, count: 1 });
  }

  return {
    branches,
    departments,
    designations,
    workLocations,
    holidays,
    shiftTemplates,
    employmentTypes,
    employeesByDepartment: Array.from(deptMap.values()).sort((a, b) => b.count - a.count),
    employeesByBranch: Array.from(branchMap.values()).sort((a, b) => b.count - a.count),
  };
}

export async function searchOrganization(
  supabase: AuthSupabaseClient,
  organizationId: string,
  query: string,
): Promise<OrgSearchResult> {
  const term = `%${query}%`;

  const [departments, branches, designations, workLocations] = await Promise.all([
    supabase
      .schema("hrms")
      .from("departments")
      .select("id, name, code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(`name.ilike.${term},code.ilike.${term}`)
      .limit(10),
    supabase
      .schema("hrms")
      .from("branches")
      .select("id, name, code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(`name.ilike.${term},code.ilike.${term}`)
      .limit(10),
    supabase
      .schema("hrms")
      .from("designations")
      .select("id, title, code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(`title.ilike.${term},code.ilike.${term}`)
      .limit(10),
    supabase
      .schema("hrms")
      .from("work_locations")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .ilike("name", term)
      .limit(10),
  ]);

  return {
    departments: (departments.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
    })),
    branches: (branches.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
    })),
    designations: (designations.data ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      code: d.code,
    })),
    workLocations: (workLocations.data ?? []).map((w) => ({
      id: w.id,
      name: w.name,
    })),
  };
}

export async function listBranches(
  supabase: AuthSupabaseClient,
  organizationId: string,
  params: OrgListParams,
): Promise<BranchListResult> {
  const { page, pageSize, search, status, sortBy, sortOrder } = parseListParams(params);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("branches")
    .select(
      `id, code, name, location, address_line1, address_line2, city, state, postal_code, country,
       phone, email, branch_head_id, is_head_office, status, updated_at,
       branch_head:branch_head_id (first_name, last_name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (search) {
    const term = `%${search}%`;
    query = query.or(`name.ilike.${term},code.ilike.${term},city.ilike.${term}`);
  }
  if (status) query = query.eq("status", status);

  query = query.order(sortBy ?? "updated_at", { ascending: sortOrder === "asc" });
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = await Promise.all(
    (data ?? []).map(async (row) => {
      const head = unwrapRelation(
        row.branch_head as { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null,
      );
      const employeeCount = await countEmployees(supabase, organizationId, { branchId: row.id });
      return {
        id: row.id,
        code: row.code,
        name: row.name,
        location: row.location,
        addressLine1: row.address_line1,
        addressLine2: row.address_line2,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        country: row.country,
        phone: row.phone,
        email: row.email,
        branchHeadId: row.branch_head_id,
        branchHeadName: head ? `${head.first_name} ${head.last_name}` : null,
        isHeadOffice: row.is_head_office,
        status: row.status,
        employeeCount,
        updatedAt: row.updated_at,
      };
    }),
  );

  return { data: rows, total: count ?? 0, page, pageSize };
}

export async function listDepartments(
  supabase: AuthSupabaseClient,
  organizationId: string,
  params: OrgListParams,
): Promise<DepartmentListResult> {
  const { page, pageSize, search, status, sortBy, sortOrder } = parseListParams(params);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("departments")
    .select(
      `id, name, code, description, department_head_id, parent_department_id, branch_id, status, updated_at,
       department_head:department_head_id (first_name, last_name),
       parent_department:parent_department_id (name),
       branches:branch_id (name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (search) {
    const term = `%${search}%`;
    query = query.or(`name.ilike.${term},code.ilike.${term}`);
  }
  if (status) query = query.eq("status", status);

  query = query.order(sortBy ?? "name", { ascending: sortOrder === "asc" });
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = await Promise.all(
    (data ?? []).map(async (row) => {
      const head = unwrapRelation(
        row.department_head as { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null,
      );
      const parent = unwrapRelation(row.parent_department as { name: string } | { name: string }[] | null);
      const branch = unwrapRelation(row.branches as { name: string } | { name: string }[] | null);
      const employeeCount = await countEmployees(supabase, organizationId, { departmentId: row.id });
      return {
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        departmentHeadId: row.department_head_id,
        departmentHeadName: head ? `${head.first_name} ${head.last_name}` : null,
        parentDepartmentId: row.parent_department_id,
        parentDepartmentName: parent?.name ?? null,
        branchId: row.branch_id,
        branchName: branch?.name ?? null,
        status: row.status,
        employeeCount,
        updatedAt: row.updated_at,
      };
    }),
  );

  return { data: rows, total: count ?? 0, page, pageSize };
}

export async function listDesignations(
  supabase: AuthSupabaseClient,
  organizationId: string,
  params: OrgListParams,
): Promise<DesignationListResult> {
  const { page, pageSize, search, status, sortBy, sortOrder } = parseListParams(params);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("designations")
    .select(
      `id, title, code, department_id, level, description, status, updated_at,
       departments:department_id (name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (search) {
    const term = `%${search}%`;
    query = query.or(`title.ilike.${term},code.ilike.${term}`);
  }
  if (status) query = query.eq("status", status);

  query = query.order(sortBy ?? "level", { ascending: sortOrder === "asc" });
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = await Promise.all(
    (data ?? []).map(async (row) => {
      const dept = unwrapRelation(row.departments as { name: string } | { name: string }[] | null);
      const employeeCount = await countEmployees(supabase, organizationId, { designationId: row.id });
      return {
        id: row.id,
        title: row.title,
        code: row.code,
        departmentId: row.department_id,
        departmentName: dept?.name ?? null,
        level: row.level,
        description: row.description,
        status: row.status,
        employeeCount,
        updatedAt: row.updated_at,
      };
    }),
  );

  return { data: rows, total: count ?? 0, page, pageSize };
}

export async function listEmploymentTypes(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<EmploymentTypeListItem[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employment_types")
    .select("id, name, code, description, is_full_time, default_hours_per_week, status, updated_at")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");

  if (error) throw new Error(error.message);

  return Promise.all(
    (data ?? []).map(async (row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description,
      isFullTime: row.is_full_time,
      defaultHoursPerWeek: Number(row.default_hours_per_week),
      status: row.status,
      employeeCount: await countEmployees(supabase, organizationId, { employmentTypeId: row.id }),
      updatedAt: row.updated_at,
    })),
  );
}

export async function listWorkLocations(
  supabase: AuthSupabaseClient,
  organizationId: string,
  params: OrgListParams,
): Promise<WorkLocationListResult> {
  const { page, pageSize, search, status, sortOrder } = parseListParams(params);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("work_locations")
    .select(
      `id, name, branch_id, working_days, office_start_time, office_end_time,
       latitude, longitude, status, updated_at, branches:branch_id (name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (search) query = query.ilike("name", `%${search}%`);
  if (status) query = query.eq("status", status);

  query = query.order("name", { ascending: sortOrder === "asc" });
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).map((row) => {
      const branch = unwrapRelation(row.branches as { name: string } | { name: string }[] | null);
      return {
        id: row.id,
        name: row.name,
        branchId: row.branch_id,
        branchName: branch?.name ?? null,
        workingDays: (row.working_days as string[]) ?? [],
        officeStartTime: String(row.office_start_time).slice(0, 5),
        officeEndTime: String(row.office_end_time).slice(0, 5),
        latitude: row.latitude ? Number(row.latitude) : null,
        longitude: row.longitude ? Number(row.longitude) : null,
        status: row.status,
        updatedAt: row.updated_at,
      };
    }),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listHolidays(
  supabase: AuthSupabaseClient,
  organizationId: string,
  params: { year?: number; search?: string },
): Promise<HolidayListResult> {
  const { year, search } = holidayListParamsSchema.parse(params);
  const targetYear = year ?? new Date().getFullYear();

  let query = supabase
    .schema("hrms")
    .from("holidays")
    .select(
      `id, name, holiday_date, holiday_type, branch_id, is_optional, is_recurring,
       recurring_month, recurring_day, applicable_department_ids, description, status,
       branches:branch_id (name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("holiday_date", `${targetYear}-01-01`)
    .lte("holiday_date", `${targetYear}-12-31`);

  if (search) query = query.ilike("name", `%${search}%`);
  query = query.order("holiday_date");

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const deptIds = new Set<string>();
  for (const row of data ?? []) {
    for (const id of (row.applicable_department_ids as string[]) ?? []) {
      deptIds.add(id);
    }
  }

  let deptNames = new Map<string, string>();
  if (deptIds.size > 0) {
    const { data: depts } = await supabase
      .schema("hrms")
      .from("departments")
      .select("id, name")
      .in("id", Array.from(deptIds));
    deptNames = new Map((depts ?? []).map((d) => [d.id, d.name]));
  }

  const holidays: HolidayListItem[] = (data ?? []).map((row) => {
    const branch = unwrapRelation(row.branches as { name: string } | { name: string }[] | null);
    const applicableIds = (row.applicable_department_ids as string[]) ?? [];
    return {
      id: row.id,
      name: row.name,
      holidayDate: row.holiday_date,
      holidayType: row.holiday_type,
      branchId: row.branch_id,
      branchName: branch?.name ?? null,
      isOptional: row.is_optional,
      isRecurring: row.is_recurring,
      recurringMonth: row.recurring_month,
      recurringDay: row.recurring_day,
      applicableDepartmentIds: applicableIds,
      applicableDepartmentNames: applicableIds.map((id) => deptNames.get(id) ?? id),
      description: row.description,
      status: row.status,
    };
  });

  return { data: holidays, total: count ?? 0, year: targetYear, page: 1 };
}

export async function listShiftTemplates(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<ShiftTemplateListItem[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("shift_templates")
    .select(
      "id, name, start_time, end_time, break_duration_minutes, grace_time_minutes, minimum_hours, half_day_hours, status, updated_at",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    breakDurationMinutes: row.break_duration_minutes,
    graceTimeMinutes: row.grace_time_minutes,
    minimumHours: Number(row.minimum_hours),
    halfDayHours: Number(row.half_day_hours),
    status: row.status,
    updatedAt: row.updated_at,
  }));
}

export async function listHierarchyEmployees(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<HierarchyEmployee[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `id, employee_code, first_name, last_name, reporting_manager_id,
       designations:designation_id (title),
       departments:department_id (name)`,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .in("employment_status", ["active", "probation", "on_leave"])
    .order("first_name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const designation = unwrapRelation(row.designations as { title: string } | { title: string }[] | null);
    const department = unwrapRelation(row.departments as { name: string } | { name: string }[] | null);
    return {
      id: row.id,
      employeeCode: row.employee_code,
      fullName: `${row.first_name} ${row.last_name}`,
      designationTitle: designation?.title ?? null,
      departmentName: department?.name ?? null,
      reportingManagerId: row.reporting_manager_id,
    };
  });
}

export function buildHierarchyTree(employees: HierarchyEmployee[]): HierarchyNode[] {
  const nodeMap = new Map<string, HierarchyNode>();
  for (const emp of employees) {
    nodeMap.set(emp.id, {
      id: emp.id,
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      designationTitle: emp.designationTitle,
      departmentName: emp.departmentName,
      reportingManagerId: emp.reportingManagerId,
      children: [],
    });
  }

  const roots: HierarchyNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.reportingManagerId && nodeMap.has(node.reportingManagerId)) {
      nodeMap.get(node.reportingManagerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: HierarchyNode[]) => {
    nodes.sort((a, b) => a.fullName.localeCompare(b.fullName));
    for (const n of nodes) sortNodes(n.children);
  };
  sortNodes(roots);
  return roots;
}

export async function wouldCreateCircularReporting(
  supabase: AuthSupabaseClient,
  employeeId: string,
  newManagerId: string | null,
): Promise<boolean> {
  if (!newManagerId) return false;
  if (employeeId === newManagerId) return true;

  const { data: employees, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, reporting_manager_id")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const managerMap = new Map(
    (employees ?? []).map((e) => [e.id, e.reporting_manager_id as string | null]),
  );

  let currentId: string | null = newManagerId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === employeeId) return true;
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = managerMap.get(currentId) ?? null;
  }

  return false;
}
