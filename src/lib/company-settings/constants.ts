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
  group: "organization" | "hr" | "platform";
}[] = [
  {
    id: "profile",
    title: "Company Profile",
    description: "Legal name, registration, fiscal year, timezone, and contact details.",
    group: "organization",
  },
  {
    id: "branding",
    title: "Branding",
    description: "Portal colors, login screen copy, logos, and employee-facing identity.",
    group: "organization",
  },
  {
    id: "working",
    title: "Work & Attendance",
    description: "Office hours, working days, grace time, weekends, and default shifts.",
    group: "hr",
  },
  {
    id: "leave",
    title: "Leave Policies",
    description: "Leave year, approvals, half-day rules, carry forward, and encashment.",
    group: "hr",
  },
  {
    id: "payroll",
    title: "Payroll",
    description: "Pay cycles, statutory defaults, approval workflow, and payslip rules.",
    group: "hr",
  },
  {
    id: "recruitment",
    title: "Hiring",
    description: "Job numbering, interview defaults, offer rules, and hiring sources.",
    group: "hr",
  },
  {
    id: "performance",
    title: "Performance",
    description: "Review cycles, goal categories, rating scales, and calibration rules.",
    group: "hr",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Email and in-app delivery, reminders, and digest schedules.",
    group: "platform",
  },
  {
    id: "security",
    title: "Security",
    description: "Password policy, session timeout, lockouts, and MFA readiness.",
    group: "platform",
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "SMTP, calendars, storage, webhooks, and API access.",
    group: "platform",
  },
  {
    id: "backup",
    title: "Backup & Maintenance",
    description: "Backup frequency, maintenance mode, and audit log retention.",
    group: "platform",
  },
];

export const COMPANY_SETTINGS_GROUPS = [
  { id: "organization" as const, label: "Organization" },
  { id: "hr" as const, label: "HR policies" },
  { id: "platform" as const, label: "Platform" },
];

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

export function canViewCompanySettings(permissionCodes: string[]) {
  return hasPermission(permissionCodes, "settings.view");
}

export function canEditCompanySettings(profile: Pick<UserProfile, "permissionCodes" | "roles">) {
  if (hasPermission(profile.permissionCodes, "settings.edit")) return true;
  return profile.roles.some((role) => role.code === "super_admin");
}
