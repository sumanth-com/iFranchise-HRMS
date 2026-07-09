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

export const COMPANY_SETTINGS_SECTIONS: {
  id: CompanySettingsSection;
  title: string;
  description: string;
}[] = [
  {
    id: "profile",
    title: "Company Profile",
    description: "Legal identity, contact details, and regional preferences.",
  },
  {
    id: "working",
    title: "Working Configuration",
    description: "Office hours, working days, breaks, and shift defaults.",
  },
  {
    id: "leave",
    title: "Leave Policies",
    description: "Leave year, approvals, carry forward, and encashment rules.",
  },
  {
    id: "payroll",
    title: "Payroll Configuration",
    description: "Payroll cycle, statutory deductions, and salary components.",
  },
  {
    id: "recruitment",
    title: "Recruitment Configuration",
    description: "Numbering prefixes, hiring defaults, and auto onboarding.",
  },
  {
    id: "performance",
    title: "Performance Configuration",
    description: "Review cycles, rating scales, and promotion eligibility.",
  },
  {
    id: "notifications",
    title: "Notification Configuration",
    description: "Email, in-app delivery, reminders, and digest settings.",
  },
  {
    id: "security",
    title: "Security",
    description: "Password policy, sessions, login attempts, and MFA readiness.",
  },
  {
    id: "branding",
    title: "Branding",
    description: "Colors, logos, login screen, and footer branding.",
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "SMTP, calendars, storage, and webhooks.",
  },
  {
    id: "backup",
    title: "Backup & Maintenance",
    description: "Backup frequency, maintenance mode, and log retention.",
  },
];

export const MODULE_SETTINGS_REDIRECTS: Record<string, CompanySettingsSection> = {
  "/dashboard/payroll/settings": "payroll",
  "/dashboard/recruitment/settings": "recruitment",
  "/dashboard/performance/settings": "performance",
  "/dashboard/leave/settings": "leave",
  "/dashboard/exit/settings": "leave",
  "/dashboard/assets/settings": "working",
  "/dashboard/documents/settings": "profile",
  "/dashboard/reports/settings": "profile",
};

export function canViewCompanySettings(permissionCodes: string[]) {
  return hasPermission(permissionCodes, "settings.view");
}

export function canEditCompanySettings(profile: Pick<UserProfile, "permissionCodes" | "roles">) {
  if (hasPermission(profile.permissionCodes, "settings.edit")) return true;
  return profile.roles.some((role) => role.code === "super_admin");
}
