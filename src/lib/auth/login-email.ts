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

function logResolveTiming(t0: number, label: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[login-timing]", {
    atMs: Math.round(performance.now() - t0),
    label: `resolveApprovedLoginEmail:${label}`,
  });
}

/**
 * Resolves the email used for Supabase auth from any HR-approved address.
 * Login may use the employee record email or their personal email on file.
 *
 * Uses exact equality (emails are stored lowercased / citext) — not ILIKE —
 * to avoid slow sequential scans on large employee tables.
 */
export async function resolveApprovedLoginEmail(emailInput: string): Promise<string> {
  const normalized = emailInput.trim().toLowerCase();
  if (!normalized) return normalized;

  const t0 = performance.now();
  const admin = createAdminClient();

  const { data: directMatch, error: directError } = await admin
    .schema("hrms")
    .from("employees")
    .select("email, account_status, deleted_at")
    .eq("email", normalized)
    .is("deleted_at", null)
    .maybeSingle();
  logResolveTiming(t0, "employees.email eq");

  if (directError && process.env.NODE_ENV === "development") {
    console.error("[resolveApprovedLoginEmail] employees lookup failed:", directError.message);
  }

  if (
    directMatch?.email &&
    ELIGIBLE_ACCOUNT_STATUSES.has(directMatch.account_status)
  ) {
    return String(directMatch.email).toLowerCase();
  }

  const { data: profileMatch, error: profileError } = await admin
    .schema("hrms")
    .from("employee_profiles")
    .select(
      "personal_email, employees:employee_id(email, account_status, deleted_at)",
    )
    .eq("personal_email", normalized)
    .is("deleted_at", null)
    .maybeSingle();
  logResolveTiming(t0, "employee_profiles.personal_email eq");

  if (profileError && process.env.NODE_ENV === "development") {
    console.error(
      "[resolveApprovedLoginEmail] personal email lookup failed:",
      profileError.message,
    );
  }

  const employee = unwrapEmployee(
    profileMatch?.employees as EmployeeEmailRow | EmployeeEmailRow[] | null,
  );
  if (
    employee?.email &&
    !employee.deleted_at &&
    ELIGIBLE_ACCOUNT_STATUSES.has(employee.account_status)
  ) {
    return String(employee.email).toLowerCase();
  }

  return normalized;
}
