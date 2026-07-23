import { hasPermission } from "@/lib/permissions/utils";
import type { UserProfile } from "@/types/auth";
import type { CompanySettingsSection } from "@/types/company-settings";

export const COMPANY_SETTINGS_ROUTES = {
  base: "/dashboard/company-settings",
  section: (section: CompanySettingsSection) =>
    `/dashboard/company-settings?section=${section}`,
} as const;

export const COMPANY_SETTINGS_VIEW_PERMISSIONS = ["settings.view"] as const;
export const COMPANY_SETTINGS_EDIT_PERMISSIONS = ["settings.edit"] as const;

/** HR-facing company settings shown in the portal (platform controls live under System Administration). */
export const COMPANY_SETTINGS_SECTIONS: {
  id: CompanySettingsSection;
  title: string;
  description: string;
}[] = [
  {
    id: "profile",
    title: "Company Profile",
    description: "Legal name, registration, addresses, timezone, and regional defaults.",
  },
  {
    id: "branding",
    title: "Branding",
    description: "Portal colors, login screen copy, and employee-facing identity.",
  },
  {
    id: "working",
    title: "Work & Attendance",
    description: "Office hours, working days, grace time, weekends, and default shifts.",
  },
  {
    id: "leave",
    title: "Leave Policies",
    description: "Leave year, approvals, half-day rules, carry forward, and encashment.",
  },
  {
    id: "payroll",
    title: "Payroll",
    description: "Pay cycles, statutory defaults, approval workflow, and payslip rules.",
  },
  {
    id: "recruitment",
    title: "Hiring",
    description: "Job numbering, interview defaults, offer rules, and hiring sources.",
  },
  {
    id: "performance",
    title: "Performance",
    description: "Review cycles, goal categories, rating scales, and calibration rules.",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Organization-wide email and in-app delivery defaults.",
  },
];

/** Legacy section slugs removed from the HR settings UI. */
export const DEPRECATED_COMPANY_SETTINGS_SECTIONS = [
  "security",
  "integrations",
  "backup",
] as const;

export const MODULE_SETTINGS_REDIRECTS: Record<string, CompanySettingsSection> = {
  "/dashboard/payroll-management/settings": "payroll",
  "/dashboard/recruitment/settings": "recruitment",
  "/dashboard/performance/settings": "performance",
  "/dashboard/leave/settings": "leave",
  "/dashboard/leave-management/settings": "leave",
  "/dashboard/attendance-management/settings": "working",
  "/dashboard/exit/settings": "leave",
  "/dashboard/assets-management/settings": "working",
  "/dashboard/documents-management/settings": "profile",
  "/dashboard/reports/settings": "profile",
};

export function isCompanySettingsSection(value: string | undefined): value is CompanySettingsSection {
  return COMPANY_SETTINGS_SECTIONS.some((section) => section.id === value);
}

export function canViewCompanySettings(permissionCodes: string[]) {
  return hasPermission(permissionCodes, "settings.view");
}

export function canEditCompanySettings(profile: Pick<UserProfile, "permissionCodes" | "roles">) {
  if (hasPermission(profile.permissionCodes, "settings.edit")) return true;
  return profile.roles.some((role) => role.code === "super_admin");
}
