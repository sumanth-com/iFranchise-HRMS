import type { EmploymentStatus } from "@/types/auth";

/**
 * Authoritative workforce eligibility from `employees.employment_status`.
 * Do not infer from name, employee code, portal access, or joining date.
 *
 * Active = currently employed workforce (includes probation + on_leave).
 * Former = exited via resignation or termination.
 */

export const ACTIVE_EMPLOYMENT_STATUSES = [
  "active",
  "probation",
  "on_leave",
] as const satisfies readonly EmploymentStatus[];

export const FORMER_EMPLOYMENT_STATUSES = [
  "resigned",
  "terminated",
] as const satisfies readonly EmploymentStatus[];

export type ActiveEmploymentStatus = (typeof ACTIVE_EMPLOYMENT_STATUSES)[number];
export type FormerEmploymentStatus = (typeof FORMER_EMPLOYMENT_STATUSES)[number];

/** Mutable copy for Supabase `.in("employment_status", …)` filters. */
export function activeEmploymentStatusFilter(): ActiveEmploymentStatus[] {
  return [...ACTIVE_EMPLOYMENT_STATUSES];
}

export function formerEmploymentStatusFilter(): FormerEmploymentStatus[] {
  return [...FORMER_EMPLOYMENT_STATUSES];
}

export function isActiveEmploymentStatus(
  status: string | null | undefined,
): status is ActiveEmploymentStatus {
  return (
    status === "active" || status === "probation" || status === "on_leave"
  );
}

export function isFormerEmploymentStatus(
  status: string | null | undefined,
): status is FormerEmploymentStatus {
  return status === "resigned" || status === "terminated";
}
