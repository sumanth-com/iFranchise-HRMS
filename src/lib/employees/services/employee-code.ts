import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Allocates the next unused employee code for an organization.
 * Format: IF{year}{3-digit sequence}, e.g. IF2026023.
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

  const year = new Date().getFullYear();
  const prefix = `IF${year}`;
  const yearPattern = new RegExp(`^${prefix}(\\d{3})$`);

  let maxSeq = 0;
  for (const code of existingCodes) {
    const match = code.match(yearPattern);
    if (!match) continue;
    const value = Number.parseInt(match[1], 10);
    if (!Number.isNaN(value)) {
      maxSeq = Math.max(maxSeq, value);
    }
  }

  for (let offset = 1; offset <= 500; offset++) {
    const candidate = `${prefix}${String(maxSeq + offset).padStart(3, "0")}`;
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }

  return `${prefix}${String(Date.now()).slice(-3)}`;
}
