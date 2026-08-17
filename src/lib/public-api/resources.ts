import { publicApiJson, type PublicApiContext, listParams } from "@/lib/public-api/handler";
import { PublicApiError } from "@/lib/public-api/errors";

function unwrap<T>(value: unknown): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  return value as T;
}

export async function listEmployeesResource(ctx: PublicApiContext) {
  const params = listParams(ctx.url);
  const status = ctx.url.searchParams.get("employmentStatus")?.trim();
  const departmentId = ctx.url.searchParams.get("departmentId")?.trim();

  let query = ctx.admin
    .schema("hrms")
    .from("employees")
    .select(
      `
        id, employee_code, first_name, last_name, email, phone,
        employment_status, date_of_joining, department_id, branch_id,
        designation_id, reporting_manager_id, created_at, updated_at,
        departments:department_id (id, name, code),
        branches:branch_id (id, name, code),
        designations:designation_id (id, title)
      `,
      { count: "exact" },
    )
    .eq("organization_id", ctx.apiKey.organizationId)
    .is("deleted_at", null)
    .range(params.from, params.to);

  if (status) query = query.eq("employment_status", status);
  if (departmentId) query = query.eq("department_id", departmentId);
  if (params.search) {
    const term = `%${params.search}%`;
    query = query.or(
      `employee_code.ilike.${term},first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`,
    );
  }

  const sortColumn = ["employee_code", "created_at", "updated_at", "first_name"].includes(params.sort)
    ? params.sort
    : "created_at";
  query = query.order(sortColumn, { ascending: params.order === "asc" });

  const { data, error, count } = await query;
  if (error) throw new PublicApiError("internal_error");

  return publicApiJson(ctx.requestId, {
    items: (data ?? []).map(mapEmployee),
    page: params.page,
    pageSize: params.pageSize,
    total: count ?? 0,
  });
}

export async function getEmployeeResource(ctx: PublicApiContext, employeeId: string) {
  const { data, error } = await ctx.admin
    .schema("hrms")
    .from("employees")
    .select(
      `
        id, employee_code, first_name, last_name, email, phone,
        employment_status, date_of_joining, department_id, branch_id,
        designation_id, reporting_manager_id, created_at, updated_at,
        departments:department_id (id, name, code),
        branches:branch_id (id, name, code),
        designations:designation_id (id, title)
      `,
    )
    .eq("organization_id", ctx.apiKey.organizationId)
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new PublicApiError("internal_error");
  if (!data) throw new PublicApiError("not_found");
  return publicApiJson(ctx.requestId, mapEmployee(data));
}

function mapEmployee(row: Record<string, unknown>) {
  const department = unwrap<{ id: string; name: string; code: string }>(row.departments);
  const branch = unwrap<{ id: string; name: string; code: string }>(row.branches);
  const designation = unwrap<{ id: string; title: string }>(row.designations);
  return {
    id: row.id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? null,
    employmentStatus: row.employment_status,
    dateOfJoining: row.date_of_joining ?? null,
    department: department
      ? { id: department.id, name: department.name, code: department.code }
      : null,
    branch: branch ? { id: branch.id, name: branch.name, code: branch.code } : null,
    designation: designation ? { id: designation.id, title: designation.title } : null,
    reportingManagerId: row.reporting_manager_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDepartmentsResource(ctx: PublicApiContext) {
  const params = listParams(ctx.url);
  const { data, error, count } = await ctx.admin
    .schema("hrms")
    .from("departments")
    .select(
      "id, name, code, description, parent_department_id, branch_id, status, created_at, branches:branch_id (id, name, code)",
      { count: "exact" },
    )
    .eq("organization_id", ctx.apiKey.organizationId)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .range(params.from, params.to);

  if (error) throw new PublicApiError("internal_error");

  return publicApiJson(ctx.requestId, {
    items: (data ?? []).map((row) => {
      const branch = unwrap<{ id: string; name: string; code: string }>(row.branches);
      return {
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description ?? null,
        parentDepartmentId: row.parent_department_id ?? null,
        status: row.status,
        branch: branch ? { id: branch.id, name: branch.name, code: branch.code } : null,
        createdAt: row.created_at,
      };
    }),
    page: params.page,
    pageSize: params.pageSize,
    total: count ?? 0,
  });
}

export async function listAttendanceResource(ctx: PublicApiContext) {
  const params = listParams(ctx.url);
  const employeeId = ctx.url.searchParams.get("employeeId")?.trim();
  const dateFrom = ctx.url.searchParams.get("dateFrom")?.trim();
  const dateTo = ctx.url.searchParams.get("dateTo")?.trim();

  let query = ctx.admin
    .schema("hrms")
    .from("attendance")
    .select(
      "id, employee_id, attendance_date, check_in_at, check_out_at, attendance_status, work_hours, overtime_hours, created_at",
      { count: "exact" },
    )
    .eq("organization_id", ctx.apiKey.organizationId)
    .is("deleted_at", null)
    .order("attendance_date", { ascending: params.order === "asc" })
    .range(params.from, params.to);

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (dateFrom) query = query.gte("attendance_date", dateFrom);
  if (dateTo) query = query.lte("attendance_date", dateTo);

  const { data, error, count } = await query;
  if (error) throw new PublicApiError("internal_error");

  return publicApiJson(ctx.requestId, {
    items: (data ?? []).map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      date: row.attendance_date,
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
      status: row.attendance_status,
      workHours: Number(row.work_hours ?? 0),
      overtimeHours: Number(row.overtime_hours ?? 0),
      createdAt: row.created_at,
    })),
    page: params.page,
    pageSize: params.pageSize,
    total: count ?? 0,
  });
}

export async function listLeaveResource(ctx: PublicApiContext) {
  const params = listParams(ctx.url);
  const employeeId = ctx.url.searchParams.get("employeeId")?.trim();
  const leaveStatus = ctx.url.searchParams.get("leaveStatus")?.trim();

  let query = ctx.admin
    .schema("hrms")
    .from("leave_requests")
    .select(
      `
        id, employee_id, start_date, end_date, total_days, is_half_day,
        leave_status, reason, created_at,
        employees!inner (id, organization_id, employee_code, first_name, last_name),
        leave_types:leave_type_id (name, code)
      `,
      { count: "exact" },
    )
    .eq("employees.organization_id", ctx.apiKey.organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: params.order === "asc" })
    .range(params.from, params.to);

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (leaveStatus) query = query.eq("leave_status", leaveStatus);

  const { data, error, count } = await query;
  if (error) throw new PublicApiError("internal_error");

  return publicApiJson(ctx.requestId, {
    items: (data ?? []).map((row) => {
      const employee = unwrap<{
        employee_code: string;
        first_name: string;
        last_name: string;
      }>(row.employees);
      const leaveType = unwrap<{ name: string; code: string }>(row.leave_types);
      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? null,
        employeeName: employee ? `${employee.first_name} ${employee.last_name}`.trim() : null,
        leaveType: leaveType?.name ?? null,
        leaveTypeCode: leaveType?.code ?? null,
        startDate: row.start_date,
        endDate: row.end_date,
        totalDays: Number(row.total_days),
        isHalfDay: Boolean(row.is_half_day),
        status: row.leave_status,
        createdAt: row.created_at,
      };
    }),
    page: params.page,
    pageSize: params.pageSize,
    total: count ?? 0,
  });
}

export async function listPayrollResource(ctx: PublicApiContext) {
  const params = listParams(ctx.url);
  const { data, error, count } = await ctx.admin
    .schema("hrms")
    .from("payrolls")
    .select(
      "id, payroll_month, payroll_status, processed_at, approved_at, created_at",
      { count: "exact" },
    )
    .eq("organization_id", ctx.apiKey.organizationId)
    .is("deleted_at", null)
    .order("payroll_month", { ascending: false })
    .range(params.from, params.to);

  if (error) throw new PublicApiError("internal_error");

  return publicApiJson(ctx.requestId, {
    items: (data ?? []).map((row) => ({
      id: row.id,
      payrollMonth: row.payroll_month,
      status: row.payroll_status,
      processedAt: row.processed_at,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
    })),
    page: params.page,
    pageSize: params.pageSize,
    total: count ?? 0,
  });
}

export async function listAssetsResource(ctx: PublicApiContext) {
  const params = listParams(ctx.url);
  const { data, error, count } = await ctx.admin
    .schema("hrms")
    .from("assets")
    .select(
      "id, asset_code, name, asset_status, office_location, department_id, current_assignment_id, created_at",
      { count: "exact" },
    )
    .eq("organization_id", ctx.apiKey.organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(params.from, params.to);

  if (error) throw new PublicApiError("internal_error");

  return publicApiJson(ctx.requestId, {
    items: (data ?? []).map((row) => ({
      id: row.id,
      assetCode: row.asset_code,
      name: row.name,
      status: row.asset_status,
      officeLocation: row.office_location ?? null,
      departmentId: row.department_id ?? null,
      currentAssignmentId: row.current_assignment_id ?? null,
      createdAt: row.created_at,
    })),
    page: params.page,
    pageSize: params.pageSize,
    total: count ?? 0,
  });
}

export async function listPerformanceResource(ctx: PublicApiContext) {
  const params = listParams(ctx.url);
  const { data, error, count } = await ctx.admin
    .schema("hrms")
    .from("performance_reviews")
    .select("id, employee_id, review_status, cycle_id, created_at, updated_at", { count: "exact" })
    .eq("organization_id", ctx.apiKey.organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(params.from, params.to);

  if (error) throw new PublicApiError("internal_error");

  return publicApiJson(ctx.requestId, {
    items: (data ?? []).map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      status: row.review_status,
      cycleId: row.cycle_id ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    page: params.page,
    pageSize: params.pageSize,
    total: count ?? 0,
  });
}
