/**
 * App-hidden employees: retained in DB for history, excluded from HRMS visibility.
 *
 * Identification is explicit (IDs/emails), never a broad "@gmail.com" filter.
 */

import {
  excludeItSystemAccountFromEmployeeQuery,
} from "@/lib/employees/it-system-account";

/** Work emails of Gmail shell/duplicate profiles marked app-hidden. */
export const APP_HIDDEN_EMPLOYEE_EMAILS = [
  "codegai.official@gmail.com",
  "hello.codegai@gmail.com",
  "hemavathivennapusa2004@gmail.com",
  "ifranchiseemployee@gmail.com",
  "ifranchisehr@gmail.com",
  "shwetha3212@gmail.com",
  "support.suprabase@gmail.com",
] as const;

const APP_HIDDEN_EMAIL_SET = new Set(
  APP_HIDDEN_EMPLOYEE_EMAILS.map((email) => email.toLowerCase()),
);

export function normalizeEmployeeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** True when the work email is on the explicit app-hidden allowlist. */
export function isAppHiddenEmployeeEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmployeeEmail(email);
  if (!normalized) return false;
  return APP_HIDDEN_EMAIL_SET.has(normalized);
}

export function isEmployeeAppVisible(row: {
  email?: string | null;
  app_hidden_at?: string | null;
  deleted_at?: string | null;
}): boolean {
  if (row.deleted_at) return false;
  if (row.app_hidden_at) return false;
  if (isAppHiddenEmployeeEmail(row.email)) return false;
  return true;
}

/**
 * Defense-in-depth filter for employee queries (esp. service-role / admin clients
 * that bypass RLS). Prefer chaining after .from("employees").
 * Excludes app-hidden rows and the IT system account from workforce surfaces.
 */
export function filterAppVisibleEmployees<T>(query: T): T {
  const withHidden = (query as { is: (column: string, value: null) => unknown }).is(
    "app_hidden_at",
    null,
  );
  return excludeItSystemAccountFromEmployeeQuery(
    withHidden as { neq: (column: string, value: string) => unknown },
  ) as T;
}
