import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExitRow = Record<string, any>;

export function fromHrms(supabase: AuthSupabaseClient, table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.schema("hrms") as any).from(table);
}

export function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function formatEmployeeName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ").trim() || "—";
}

export function emptyToNull(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function isHrAdmin(profile: UserProfile) {
  return profile.roles.some((r) => r.code === "super_admin" || r.code === "hr_admin");
}

export function isManagerRole(profile: UserProfile) {
  return profile.roles.some((r) => r.code === "manager");
}

export function isCeoRole(profile: UserProfile) {
  return profile.roles.some((r) =>
    ["ceo", "founder", "co_founder"].includes(r.code),
  );
}

export function isEmployeeOnly(profile: UserProfile) {
  return !isHrAdmin(profile) && !isManagerRole(profile) && !isCeoRole(profile);
}

export function formatCurrencyInr(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function addDaysIso(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
