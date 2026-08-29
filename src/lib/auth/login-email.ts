import { createAdminClient } from "@/lib/supabase/admin";

const ELIGIBLE_ACCOUNT_STATUSES = new Set([
  "draft",
  "invited",
  "invitation_pending",
  "active",
]);

/** Account statuses that must never receive portal sessions via password login. */
const PORTAL_DENIED_ACCOUNT_STATUSES = new Set([
  "draft",
  "inactive",
  "suspended",
  "archived",
]);

type EmployeeEmailRow = {
  email: string;
  deleted_at: string | null;
  account_status: string;
};

type EmployeeLoginAccessRow = {
  email: string;
  deleted_at: string | null;
  account_status: string;
  user_id: string | null;
};

function unwrapEmployee(
  value: EmployeeEmailRow | EmployeeEmailRow[] | null | undefined,
): EmployeeEmailRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function unwrapLoginAccessEmployee(
  value: EmployeeLoginAccessRow | EmployeeLoginAccessRow[] | null | undefined,
): EmployeeLoginAccessRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isPortalLoginDenied(employee: EmployeeLoginAccessRow): boolean {
  if (employee.deleted_at) return true;
  if (!employee.user_id) return true;
  return PORTAL_DENIED_ACCOUNT_STATUSES.has(String(employee.account_status ?? ""));
}

function logResolveTiming(t0: number, label: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[login-timing]", {
    atMs: Math.round(performance.now() - t0),
    label: `resolveApprovedLoginEmail:${label}`,
  });
}

/**
 * Server-side gate: known HRMS employees without portal-ready auth must be
 * denied before (and independently of) Supabase credential checks.
 */
export async function evaluatePortalLoginAccess(
  emailInput: string,
): Promise<"allowed" | "denied"> {
  const normalized = emailInput.trim().toLowerCase();
  if (!normalized) return "allowed";

  const admin = createAdminClient();

  const { data: directMatch, error: directError } = await admin
    .schema("hrms")
    .from("employees")
    .select("email, account_status, deleted_at, user_id")
    .eq("email", normalized)
    .is("deleted_at", null)
    .maybeSingle();

  if (directError && process.env.NODE_ENV === "development") {
    console.error("[evaluatePortalLoginAccess] employees lookup failed:", directError.message);
  }

  const direct = directMatch as EmployeeLoginAccessRow | null;
  if (direct) {
    return isPortalLoginDenied(direct) ? "denied" : "allowed";
  }

  const { data: profileMatch, error: profileError } = await admin
    .schema("hrms")
    .from("employee_profiles")
    .select(
      "personal_email, employees:employee_id(email, account_status, deleted_at, user_id)",
    )
    .eq("personal_email", normalized)
    .is("deleted_at", null)
    .maybeSingle();

  if (profileError && process.env.NODE_ENV === "development") {
    console.error(
      "[evaluatePortalLoginAccess] personal email lookup failed:",
      profileError.message,
    );
  }

  const employee = unwrapLoginAccessEmployee(
    profileMatch?.employees as
      | EmployeeLoginAccessRow
      | EmployeeLoginAccessRow[]
      | null,
  );
  if (employee) {
    return isPortalLoginDenied(employee) ? "denied" : "allowed";
  }

  return "allowed";
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

type EmployeeAuthEmailRow = {
  email: string;
  deleted_at: string | null;
  account_status: string;
  user_id: string | null;
};

async function lookupEligibleEmployeeAuthEmail(
  normalized: string,
): Promise<string | null> {
  const admin = createAdminClient();

  const { data: directMatch, error: directError } = await admin
    .schema("hrms")
    .from("employees")
    .select("email, account_status, deleted_at, user_id")
    .eq("email", normalized)
    .is("deleted_at", null)
    .maybeSingle();

  if (directError && process.env.NODE_ENV === "development") {
    console.error("[findEligiblePasswordResetTarget] employees lookup failed:", directError.message);
  }

  const direct = directMatch as EmployeeAuthEmailRow | null;
  if (
    direct?.email &&
    direct.user_id &&
    ELIGIBLE_ACCOUNT_STATUSES.has(direct.account_status) &&
    !PORTAL_DENIED_ACCOUNT_STATUSES.has(direct.account_status)
  ) {
    return String(direct.email).toLowerCase();
  }

  const { data: profileMatch, error: profileError } = await admin
    .schema("hrms")
    .from("employee_profiles")
    .select(
      "personal_email, employees:employee_id(email, account_status, deleted_at, user_id)",
    )
    .eq("personal_email", normalized)
    .is("deleted_at", null)
    .maybeSingle();

  if (profileError && process.env.NODE_ENV === "development") {
    console.error(
      "[findEligiblePasswordResetTarget] personal email lookup failed:",
      profileError.message,
    );
  }

  const employee = unwrapEmployee(
    profileMatch?.employees as EmployeeAuthEmailRow | EmployeeAuthEmailRow[] | null,
  ) as EmployeeAuthEmailRow | null;
  if (
    employee?.email &&
    employee.user_id &&
    !employee.deleted_at &&
    ELIGIBLE_ACCOUNT_STATUSES.has(employee.account_status) &&
    !PORTAL_DENIED_ACCOUNT_STATUSES.has(employee.account_status)
  ) {
    return String(employee.email).toLowerCase();
  }

  return null;
}

/** Returns the Supabase auth email when the address maps to an eligible HRMS account. */
export async function findEligiblePasswordResetTarget(
  emailInput: string,
): Promise<string | null> {
  const normalized = emailInput.trim().toLowerCase();
  if (!normalized) return null;
  return lookupEligibleEmployeeAuthEmail(normalized);
}
