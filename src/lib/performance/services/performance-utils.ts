import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";

import type { KpiAssignmentStatus, KpiMeasurementType } from "@/types/performance";

export function formatEmployeeName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

/** Minimum value for `<input type="datetime-local" />` (local time, no past slots). */
export function getMinDateTimeLocalValue(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Minimum value for `<input type="date" />` (today, local). */
export function getMinDateLocalValue(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isPastDateTimeLocal(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return true;
  return parsed.getTime() < Date.now();
}

export function isPastDateLocal(value: string) {
  return value < getMinDateLocalValue();
}

/** Local `YYYY-MM-DD` from a `datetime-local` or ISO datetime string. */
export function getDateLocalFromDateTimeLocal(value: string) {
  if (!value) return null;
  const [datePart] = value.split("T");
  if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return getMinDateLocalValue(parsed);
}

/** Follow-up must be on/after the meeting day and not in the past. */
export function getMinFollowUpDateLocal(scheduledAt?: string | null) {
  const today = getMinDateLocalValue();
  if (!scheduledAt) return today;
  const scheduledDate = getDateLocalFromDateTimeLocal(scheduledAt);
  if (!scheduledDate) return today;
  return scheduledDate < today ? today : scheduledDate;
}

export function isFollowUpBeforeScheduled(followUpDate: string, scheduledAt: string) {
  const scheduledDate = getDateLocalFromDateTimeLocal(scheduledAt);
  if (!scheduledDate) return false;
  return followUpDate < scheduledDate;
}

export function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function calculateCompletionRate(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function calculateKpiCompletion(
  current: number,
  target: number | null,
  measurementType: KpiMeasurementType,
) {
  if (measurementType === "percentage") {
    return Math.min(100, Math.max(0, Math.round(current)));
  }
  if (measurementType === "rating") {
    const max = target && target > 0 ? target : 5;
    return Math.min(100, Math.round((current / max) * 100));
  }
  if (!target || target <= 0) return current > 0 ? 100 : 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function deriveKpiStatus(
  completionPercentage: number,
  endDate: string | null,
  currentValue: number,
): KpiAssignmentStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (completionPercentage >= 100) return "completed";
  if (endDate && endDate < today && completionPercentage < 100) return "overdue";
  if (currentValue > 0) return "in_progress";
  return "not_started";
}

export function formatKpiTarget(
  target: number | null,
  measurementType: KpiMeasurementType,
) {
  if (target === null || target === undefined) return "—";
  if (measurementType === "currency") return `₹${target.toLocaleString("en-IN")}`;
  if (measurementType === "percentage") return `${target}%`;
  if (measurementType === "rating") return `${target}/5`;
  return String(target);
}

export function formatKpiProgress(
  current: number,
  measurementType: KpiMeasurementType,
) {
  if (measurementType === "currency") return `₹${current.toLocaleString("en-IN")}`;
  if (measurementType === "percentage") return `${current}%`;
  if (measurementType === "rating") return `${current}/5`;
  return String(current);
}

export function getMonthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

/** Performance tables are not yet in generated Supabase types. */
export function fromHrms(supabase: AuthSupabaseClient, table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.schema("hrms") as any).from(table);
}
