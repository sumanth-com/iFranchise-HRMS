import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { resolveLeaveEligibilityBand } from "@/lib/leave/leave-eligibility";
import type { PolicyEmployeeCategory } from "@/lib/leave/leave-attendance-absence-policy-content";

export function resolvePolicyEmployeeCategory(input: {
  employmentStatus: string;
  employmentTypeCode?: string | null;
  isFullTime?: boolean | null;
}): PolicyEmployeeCategory {
  return resolveLeaveEligibilityBand(input) === "cl_only" ? "intern_probation" : "full_time";
}

export async function getPolicyCategoryForEmployee(
  supabase: AuthSupabaseClient,
  employeeId: string,
): Promise<PolicyEmployeeCategory> {
  try {
    const { data, error } = await supabase
      .schema("hrms")
      .from("employees")
      .select("employment_status, employment_types:employment_type_id (code, is_full_time)")
      .eq("id", employeeId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) return "full_time";

    const typeRaw = data.employment_types as
      | { code?: string | null; is_full_time?: boolean | null }
      | { code?: string | null; is_full_time?: boolean | null }[]
      | null
      | undefined;
    const typeRow = Array.isArray(typeRaw) ? typeRaw[0] : typeRaw;

    return resolvePolicyEmployeeCategory({
      employmentStatus: String(data.employment_status ?? "active"),
      employmentTypeCode: typeRow?.code ?? null,
      isFullTime: typeof typeRow?.is_full_time === "boolean" ? typeRow.is_full_time : null,
    });
  } catch {
    return "full_time";
  }
}
