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

/** HR-facing company settings — single profile page in the portal UI. */
export const COMPANY_SETTINGS_SECTIONS: {
  id: CompanySettingsSection;
  title: string;
  description: string;
}[] = [
  {
    id: "profile",
    title: "Company Profile",
    description: "Logo, legal name, contact details, and office address.",
  },
];

/** Legacy section slugs — redirect to the main settings page. */
export const DEPRECATED_COMPANY_SETTINGS_SECTIONS = [
  "security",
  "integrations",
  "backup",
  "branding",
  "working",
  "leave",
  "payroll",
  "recruitment",
  "performance",
  "notifications",
] as const;

export const MODULE_SETTINGS_REDIRECTS: Record<string, string> = {
  "/dashboard/payroll-management/settings": COMPANY_SETTINGS_ROUTES.base,
  "/dashboard/recruitment/settings": COMPANY_SETTINGS_ROUTES.base,
  "/dashboard/performance/settings": COMPANY_SETTINGS_ROUTES.base,
  "/dashboard/leave/settings": COMPANY_SETTINGS_ROUTES.base,
  "/dashboard/leave-management/settings": COMPANY_SETTINGS_ROUTES.base,
  "/dashboard/attendance-management/settings": COMPANY_SETTINGS_ROUTES.base,
  "/dashboard/exit/settings": COMPANY_SETTINGS_ROUTES.base,
  "/dashboard/assets-management/settings": COMPANY_SETTINGS_ROUTES.base,
  "/dashboard/documents-management/settings": COMPANY_SETTINGS_ROUTES.base,
  "/dashboard/reports/settings": COMPANY_SETTINGS_ROUTES.base,
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
