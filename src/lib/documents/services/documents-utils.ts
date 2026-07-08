import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { isHrOrAdmin, isManager } from "@/lib/documents/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DocRow = Record<string, any>;

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

export function isEmployeeScoped(profile: UserProfile) {
  return !isHrOrAdmin(profile) && !isManager(profile);
}

export function scopeEmployeeId(profile: UserProfile, requested?: string | null) {
  if (isEmployeeScoped(profile)) {
    return profile.employee.id;
  }
  return requested && requested.length > 0 ? requested : undefined;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCurrencyInr(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function stripHtml(html: string) {
  return html
    .replace(/<\/(p|div|br|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
