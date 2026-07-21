import { createAdminClient } from "@/lib/supabase/admin";

const ELIGIBLE_ACCOUNT_STATUSES = new Set([
  "draft",
  "invited",
  "invitation_pending",
  "active",
]);

type EmployeeEmailRow = {
  email: string;
  deleted_at: string | null;
  account_status: string;
};

function unwrapEmployee(
  value: EmployeeEmailRow | EmployeeEmailRow[] | null | undefined,
): EmployeeEmailRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Resolves the email used for Supabase auth from any HR-approved address.
 * Login may use the employee record email or their personal email on file.
 */
export async function resolveApprovedLoginEmail(emailInput: string): Promise<string> {
  const normalized = emailInput.trim().toLowerCase();
  if (!normalized) return normalized;

  const admin = createAdminClient();

  const { data: directMatch } = await admin
    .schema("hrms")
    .from("employees")
    .select("email, account_status, deleted_at")
    .ilike("email", normalized)
    .is("deleted_at", null)
    .maybeSingle();

  if (
    directMatch?.email &&
    ELIGIBLE_ACCOUNT_STATUSES.has(directMatch.account_status)
  ) {
    return String(directMatch.email).toLowerCase();
  }

  const { data: profileMatches } = await admin
    .schema("hrms")
    .from("employee_profiles")
    .select(
      "personal_email, employees:employee_id(email, account_status, deleted_at)",
    )
    .ilike("personal_email", normalized)
    .is("deleted_at", null);

  for (const row of profileMatches ?? []) {
    const employee = unwrapEmployee(
      row.employees as EmployeeEmailRow | EmployeeEmailRow[] | null,
    );
    if (
      employee?.email &&
      !employee.deleted_at &&
      ELIGIBLE_ACCOUNT_STATUSES.has(employee.account_status)
    ) {
      return String(employee.email).toLowerCase();
    }
  }

  return normalized;
}
