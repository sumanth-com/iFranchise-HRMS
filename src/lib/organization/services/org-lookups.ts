import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { LookupOption } from "@/types/employee";

export function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function emptyToNull(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

export async function getBranches(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("branches")
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

export async function getDepartments(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("departments")
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

export async function getDesignations(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("designations")
    .select("id, title, code")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active")
    .order("title");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.title,
    code: row.code,
  }));
}

export async function getEmploymentTypes(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employment_types")
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

export async function getShiftTemplates(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("shift_templates")
    .select("id, name")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active")
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.name,
  }));
}

export async function getWorkLocations(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("work_locations")
    .select("id, name")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active")
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.name,
  }));
}

export async function getEmployeeLookups(
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

export async function getOrganizationLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
  excludeEmployeeId?: string,
) {
  const [branches, departments, designations, employmentTypes, employees, shiftTemplates, workLocations] =
    await Promise.all([
      getBranches(supabase, organizationId),
      getDepartments(supabase, organizationId),
      getDesignations(supabase, organizationId),
      getEmploymentTypes(supabase, organizationId),
      getEmployeeLookups(supabase, organizationId, excludeEmployeeId),
      getShiftTemplates(supabase, organizationId),
      getWorkLocations(supabase, organizationId),
    ]);

  return {
    branches,
    departments,
    designations,
    employmentTypes,
    employees,
    shiftTemplates,
    workLocations,
  };
}
