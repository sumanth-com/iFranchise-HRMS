export const SYSTEM_ADMIN_ROUTES = {
  home: "/dashboard/system",
  dashboard: "/dashboard/system",
  overview: "/dashboard/system/overview",
  profile: "/dashboard/system/profile",
  attendance: "/dashboard/system/attendance",
  payroll: "/dashboard/system/payroll",
  documents: "/dashboard/system/documents",
  leave: "/dashboard/system/leave",
  goals: "/dashboard/system/goals",
  assets: "/dashboard/system/assets",
  notifications: "/dashboard/system/notifications",
  notificationsCenter: "/dashboard/system/notifications/center",
  notificationsHistory: "/dashboard/system/notifications/history",
  settings: "/dashboard/system/settings",
  hrOverview: "/dashboard/system/hr-overview",
  employees: "/dashboard/system/employees",
  organization: "/dashboard/system/organization",
  roles: "/dashboard/system/roles",
  permissions: "/dashboard/system/permissions",
  provisioning: "/dashboard/system/provisioning",
  iam: "/dashboard/system/iam",
  configuration: "/dashboard/system/configuration",
  database: "/dashboard/system/database",
  storage: "/dashboard/system/storage",
  email: "/dashboard/system/email",
  apiKeys: "/dashboard/system/api-keys",
  audit: "/dashboard/system/audit",
  logs: "/dashboard/system/logs",
  security: "/dashboard/system/security",
  integrations: "/dashboard/system/integrations",
  license: "/dashboard/system/license",
  featureFlags: "/dashboard/system/feature-flags",
  maintenance: "/dashboard/system/maintenance",
  backup: "/dashboard/system/backup",
  importExport: "/dashboard/system/import-export",
  environment: "/dashboard/system/environment",
  branding: "/dashboard/system/branding",
  smtp: "/dashboard/system/smtp",
} as const;

export type SystemModuleSlug = keyof typeof SYSTEM_ADMIN_ROUTES extends infer K
  ? K extends `${string}`
    ? K extends "home"
      ? never
      : K
    : never
  : never;

export const SYSTEM_ADMIN_PERMISSION = "system.admin.access" as const;

export const SUPER_ADMIN_PORTAL_LABEL = "Super Admin Portal";

export const SUPER_ADMIN_SELF_SERVICE_DASHBOARD_KPI_LINKS = {
  attendance: SYSTEM_ADMIN_ROUTES.attendance,
  workingHours: SYSTEM_ADMIN_ROUTES.attendance,
  leaveBalance: SYSTEM_ADMIN_ROUTES.leave,
  pendingLeaveRequests: `${SYSTEM_ADMIN_ROUTES.leave}?status=pending`,
} as const;

export const SUPER_ADMIN_GOALS_SUB_NAV = [
  { title: "Goals & OKRs", href: SYSTEM_ADMIN_ROUTES.goals },
  { title: "KPIs", href: `${SYSTEM_ADMIN_ROUTES.goals}/kpis` },
  { title: "Feedback", href: `${SYSTEM_ADMIN_ROUTES.goals}/feedback` },
  { title: "1:1 Meetings", href: `${SYSTEM_ADMIN_ROUTES.goals}/one-on-ones` },
  { title: "Promotions", href: `${SYSTEM_ADMIN_ROUTES.goals}/promotions` },
] as const;

export const PORTAL_SWITCH_LINKS = [
  { label: SUPER_ADMIN_PORTAL_LABEL, href: "/dashboard/system", portal: "system" },
  { label: "HR Portal", href: "/dashboard", portal: "hr" },
  { label: "Executive Portal", href: "/ceo", portal: "ceo" },
  { label: "Manager Portal", href: "/manager", portal: "manager" },
  { label: "Employee Portal", href: "/employee", portal: "employee" },
] as const;

export function portalPathMatches(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  // /dashboard must not swallow /dashboard/system (system has its own entry).
  if (href === "/dashboard" && pathname.startsWith("/dashboard/system")) return false;
  return true;
}

export function resolveActivePortalSwitchLink(
  pathname: string,
  available: ReadonlyArray<{ label: string; href: string; portal: string }>,
  preferredPortal?: string | null,
) {
  if (preferredPortal) {
    const preferred = available.find((portal) => portal.portal === preferredPortal);
    if (preferred) return preferred;
  }

  return (
    [...available]
      .sort((left, right) => right.href.length - left.href.length)
      .find((portal) => portalPathMatches(pathname, portal.href)) ?? available[0]
  );
}
