import { normalizeEmployeeCode } from "@/lib/employees/designation-display";

/**
 * Canonical IT / system operator account.
 * Authenticates and may use portal switching, but is not a normal workforce employee.
 */
export const IT_SYSTEM_ACCOUNT_EMAIL = "it@ifranchise.in";
export const IT_SYSTEM_ACCOUNT_CODE = "IF2026000";

export type ItSystemAccountIdentity = {
  email?: string | null;
  employeeCode?: string | null;
  employee_code?: string | null;
};

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * True for the IT system account (`it@ifranchise.in` / `IF2026000`).
 * Prefer this helper over scattering email string checks.
 */
export function isItSystemAccount(identity: ItSystemAccountIdentity): boolean {
  if (normalizeEmail(identity.email) === IT_SYSTEM_ACCOUNT_EMAIL) {
    return true;
  }
  const code = normalizeEmployeeCode(
    identity.employeeCode ?? identity.employee_code,
  );
  return code === IT_SYSTEM_ACCOUNT_CODE;
}

/**
 * Defense-in-depth PostgREST filter: exclude the IT system account from
 * workforce employee queries (lists, counts, dropdowns). Does not affect login
 * or profile loading, which resolve the account by user id / email directly.
 */
export function excludeItSystemAccountFromEmployeeQuery<T>(query: T): T {
  // Supabase builders are deeply generic; keep this helper loosely typed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = query;
  q = q.neq("email", IT_SYSTEM_ACCOUNT_EMAIL);
  q = q.neq("employee_code", IT_SYSTEM_ACCOUNT_CODE);
  return q as T;
}
