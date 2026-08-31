import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  buildEmployeeCodeCandidates,
  buildEmployeeSlug,
  extractSlugFromRouteRef,
  isEmployeeUuid,
} from "@/lib/employees/routing";
import type { EmployeeRouteIdentity } from "@/types/employee";

export type ResolvedEmployeeRoute = EmployeeRouteIdentity & {
  id: string;
};

async function resolveEmployeeBySlug(
  supabase: AuthSupabaseClient,
  organizationId: string,
  slug: string,
): Promise<ResolvedEmployeeRoute | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, employee_code, first_name, last_name")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const rowSlug = buildEmployeeSlug(row.first_name, row.last_name);
    if (rowSlug === normalizedSlug) {
      return {
        id: row.id,
        employeeCode: row.employee_code,
        firstName: row.first_name,
        lastName: row.last_name,
      };
    }
  }

  return null;
}

export async function resolveEmployeeFromRouteRef(
  supabase: AuthSupabaseClient,
  organizationId: string,
  routeRef: string,
): Promise<ResolvedEmployeeRoute | null> {
  if (isEmployeeUuid(routeRef)) {
    const { data, error } = await supabase
      .schema("hrms")
      .from("employees")
      .select("id, employee_code, first_name, last_name")
      .eq("id", routeRef)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      employeeCode: data.employee_code,
      firstName: data.first_name,
      lastName: data.last_name,
    };
  }

  const candidates = buildEmployeeCodeCandidates(routeRef);

  for (const employeeCode of candidates) {
    const { data, error } = await supabase
      .schema("hrms")
      .from("employees")
      .select("id, employee_code, first_name, last_name")
      .eq("organization_id", organizationId)
      .eq("employee_code", employeeCode)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        id: data.id,
        employeeCode: data.employee_code,
        firstName: data.first_name,
        lastName: data.last_name,
      };
    }
  }

  const slug = extractSlugFromRouteRef(routeRef);
  if (slug) {
    return resolveEmployeeBySlug(supabase, organizationId, slug);
  }

  return null;
}

/** Resolve an employee route ref without scoping to an organization (public QR scans). */
export async function resolveEmployeeFromRouteRefGlobal(
  supabase: AuthSupabaseClient,
  routeRef: string,
): Promise<(ResolvedEmployeeRoute & { organizationId: string }) | null> {
  if (isEmployeeUuid(routeRef)) {
    const { data, error } = await supabase
      .schema("hrms")
      .from("employees")
      .select("id, employee_code, first_name, last_name, organization_id")
      .eq("id", routeRef)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      employeeCode: data.employee_code,
      firstName: data.first_name,
      lastName: data.last_name,
      organizationId: data.organization_id as string,
    };
  }

  const candidates = buildEmployeeCodeCandidates(routeRef);

  for (const employeeCode of candidates) {
    const { data, error } = await supabase
      .schema("hrms")
      .from("employees")
      .select("id, employee_code, first_name, last_name, organization_id")
      .eq("employee_code", employeeCode)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return {
        id: data.id,
        employeeCode: data.employee_code,
        firstName: data.first_name,
        lastName: data.last_name,
        organizationId: data.organization_id as string,
      };
    }
  }

  const slug = extractSlugFromRouteRef(routeRef);
  if (!slug) {
    return null;
  }

  const normalizedSlug = slug.trim().toLowerCase();
  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, employee_code, first_name, last_name, organization_id")
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const rowSlug = buildEmployeeSlug(row.first_name, row.last_name);
    if (rowSlug === normalizedSlug) {
      return {
        id: row.id,
        employeeCode: row.employee_code,
        firstName: row.first_name,
        lastName: row.last_name,
        organizationId: row.organization_id as string,
      };
    }
  }

  return null;
}
