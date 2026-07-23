import { hasAnyPermission, hasPermission } from "@/lib/permissions/utils";
import { buildAuditLogRef } from "@/lib/audit/display";
import type { UserProfile } from "@/types/auth";
import type { AuditModule } from "@/types/audit";

export const AUDIT_ROUTES = {
  dashboard: "/dashboard/audit",
  logs: "/dashboard/audit/logs",
  timeline: "/dashboard/audit/timeline",
  settings: "/dashboard/audit/settings",
  detail: (id: string) => `/dashboard/audit/logs/${buildAuditLogRef(id)}`,
} as const;

export const AUDIT_SUB_NAV = [
  { title: "Dashboard", href: AUDIT_ROUTES.dashboard },
  { title: "Audit Logs", href: AUDIT_ROUTES.logs },
  { title: "Timeline", href: AUDIT_ROUTES.timeline },
  { title: "Retention", href: AUDIT_ROUTES.settings, admin: true },
] as const;

export const AUDIT_VIEW_PERMISSIONS = ["audit.view"] as const;
export const AUDIT_EXPORT_PERMISSIONS = ["audit.export"] as const;

export const AUDIT_MODULES: { value: AuditModule; label: string }[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "employees", label: "Employees" },
  { value: "attendance", label: "Attendance" },
  { value: "leave", label: "Leave" },
  { value: "payroll", label: "Payroll" },
  { value: "performance", label: "Performance" },
  { value: "recruitment", label: "Recruitment" },
  { value: "documents", label: "Documents" },
  { value: "assets", label: "Assets" },
  { value: "exit", label: "Exit" },
  { value: "reports", label: "Reports" },
  { value: "organization", label: "Organization" },
  { value: "roles", label: "Roles" },
  { value: "notifications", label: "Notifications" },
  { value: "settings", label: "Settings" },
];

export const AUDIT_ACTIONS = [
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "approve", label: "Approve" },
  { value: "reject", label: "Reject" },
  { value: "assign", label: "Assign" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "export", label: "Export" },
  { value: "import", label: "Import" },
  { value: "password_reset", label: "Password Reset" },
  { value: "role_change", label: "Role Change" },
  { value: "permission_change", label: "Permission Change" },
] as const;

export const AUDIT_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

/** Modules visible to HR Admin (excludes roles/security-only areas). */
export const HR_AUDIT_MODULES: AuditModule[] = [
  "employees",
  "attendance",
  "leave",
  "payroll",
  "performance",
  "recruitment",
  "documents",
  "assets",
  "exit",
  "reports",
  "organization",
  "notifications",
  "settings",
  "dashboard",
];

export function canViewAudit(codes: string[]) {
  return hasPermission(codes, "audit.view");
}

export function canExportAudit(codes: string[]) {
  return hasAnyPermission(codes, [...AUDIT_EXPORT_PERMISSIONS]);
}

export function isSuperAdmin(profile: Pick<UserProfile, "roles">) {
  return profile.roles.some((role) => role.code === "super_admin");
}

export function getAuditModuleScope(profile: UserProfile): AuditModule[] | null {
  if (!canViewAudit(profile.permissionCodes)) return [];
  if (isSuperAdmin(profile)) return null;
  return HR_AUDIT_MODULES;
}

export function formatAuditModule(module: string) {
  return AUDIT_MODULES.find((m) => m.value === module)?.label ?? module;
}

export function formatAuditAction(action: string) {
  return AUDIT_ACTIONS.find((a) => a.value === action)?.label ?? action;
}
