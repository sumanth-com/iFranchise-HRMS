import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Allocates the next unused employee code for an organization.
 * Scans all active codes and increments the highest trailing numeric suffix.
 */
export async function allocateNextEmployeeCode(
  organizationId: string,
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("employees")
    .select("employee_code")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const existingCodes = new Set(
    (data ?? []).map((row) => String(row.employee_code).trim()),
  );

  let maxSuffix = 0;
  for (const code of existingCodes) {
    const match = code.match(/(\d+)$/);
    if (!match) continue;
    const value = Number.parseInt(match[1], 10);
    if (!Number.isNaN(value)) {
      maxSuffix = Math.max(maxSuffix, value);
    }
  }

  for (let offset = 1; offset <= 500; offset++) {
    const candidate = `EMP-${maxSuffix + offset}`;
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }

  // Last-resort unique code if the numeric range is unexpectedly dense.
  return `EMP-${Date.now()}`;
}
