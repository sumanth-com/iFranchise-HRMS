import { hasAnyPermission } from "@/lib/permissions/utils";

export type SelfServicePortal = "system" | "hr" | "employee" | "manager" | "accountant";

const ATTENDANCE_STATUS_FILTERS = [
  "present",
  "absent",
  "half_day",
  "late",
  "on_leave",
  "holiday",
  "week_off",
] as const;

/**
 * Attendance workspaces are opened from several portal dashboards and older
 * links may still carry leave statuses (for example `status=pending`). Keep
 * those legacy values from reaching the attendance query schema and failing
 * the whole page.
 */
export function normalizeAttendanceStatusFilter(value: string | undefined) {
  return ATTENDANCE_STATUS_FILTERS.some((status) => status === value)
    ? value
    : undefined;
}

export function attendancePageParamsInput(
  raw: Record<string, string | string[] | undefined>,
) {
  const first = (key: string) => {
    const value = raw[key];
    return typeof value === "string" ? value : undefined;
  };

  return {
    month: first("month"),
    year: first("year"),
    date: first("date"),
    status: normalizeAttendanceStatusFilter(first("status")),
    searchDate: first("searchDate"),
    page: first("page"),
  };
}

/** Mirrors the existing page guards; consolidation must not grant feature access. */
export function canOpenSelfAttendance(codes: string[], portal: SelfServicePortal) {
  if (portal === "system") return true; // caller already passed the Super Admin guard
  if (portal === "manager") return hasAnyPermission(codes, ["portal.manager.access"]);
  return hasAnyPermission(codes, portal === "hr"
    ? ["attendance.view"] : [`portal.${portal}.access`, "attendance.view"]);
}

export function canOpenSelfLeave(codes: string[], portal: SelfServicePortal) {
  if (portal === "system") return true;
  return hasAnyPermission(codes, portal === "hr"
    ? ["leave.view"] : [`portal.${portal}.access`, "leave.view"]);
}

export function leaveWorkspaceUrl(basePath: string, raw: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach((entry) => params.append(key, entry));
    else if (value !== undefined) params.set(key, value);
  }
  params.set("history", "leave");
  if (!normalizeAttendanceStatusFilter(params.get("status") ?? undefined)) {
    params.delete("status");
  }
  params.delete("calendar");
  return `${basePath}?${params.toString()}`;
}

export function attendanceWorkspaceQuery(current: string, next: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(next)) {
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  // Older links selected a separate leave calendar; all statuses now share one calendar.
  params.delete("calendar");
  return params.toString();
}
