import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AssetRow = Record<string, any>;

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

export function isEmployeeOnly(profile: UserProfile) {
  const codes = profile.roles.map((r) => r.code);
  const isHr = codes.some((c) => c === "super_admin" || c === "hr_admin");
  const isManager = codes.includes("manager");
  return !isHr && !isManager;
}

export function formatCurrencyInr(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
