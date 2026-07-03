import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  buildEmployeeCodeCandidates,
  isEmployeeUuid,
} from "@/lib/employees/routing";
import type { EmployeeRouteIdentity } from "@/types/employee";

export type ResolvedEmployeeRoute = EmployeeRouteIdentity & {
  id: string;
};

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

  return null;
}
