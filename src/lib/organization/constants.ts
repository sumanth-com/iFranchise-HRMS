import { hasAnyPermission } from "@/lib/permissions/utils";

export const ORGANIZATION_LOGO_BUCKET = "company-assets";
export const ORGANIZATION_LOGO_PATH_PREFIX = "branding";
/** Max logo upload size (matches company-assets bucket limit). */
export const ORGANIZATION_LOGO_MAX_BYTES = 10 * 1024 * 1024;

export const ORGANIZATION_ROUTES = {
  dashboard: "/dashboard/organization",
  profile: "/dashboard/organization/profile",
  branches: "/dashboard/organization/branches",
  departments: "/dashboard/organization/departments",
  designations: "/dashboard/organization/designations",
  employmentTypes: "/dashboard/organization/employment-types",
  workLocations: "/dashboard/organization/work-locations",
  holidays: "/dashboard/organization/holidays",
  shifts: "/dashboard/organization/shifts",
  hierarchy: "/dashboard/organization/hierarchy",
} as const;

export type OrganizationModuleRoutes = {
  dashboard: string;
  profile: string;
  branches: string;
  departments: string;
  designations: string;
  employmentTypes: string;
  workLocations: string;
  holidays: string;
  shifts: string;
  hierarchy: string;
};

/** Build organization routes under an alternate portal base (e.g. Super Admin). */
export function buildOrganizationRoutes(basePath: string): OrganizationModuleRoutes {
  const base = basePath.replace(/\/$/, "") || ORGANIZATION_ROUTES.dashboard;
  return {
    dashboard: base,
    profile: `${base}/profile`,
    branches: `${base}/branches`,
    departments: `${base}/departments`,
    designations: `${base}/designations`,
    employmentTypes: `${base}/employment-types`,
    workLocations: `${base}/work-locations`,
    holidays: `${base}/holidays`,
    shifts: `${base}/shifts`,
    hierarchy: `${base}/hierarchy`,
  };
}

export const ORGANIZATION_SUB_NAV = [
  { title: "Company Profile", href: ORGANIZATION_ROUTES.profile },
  { title: "Branches", href: ORGANIZATION_ROUTES.branches },
  { title: "Departments", href: ORGANIZATION_ROUTES.departments },
  { title: "Designations", href: ORGANIZATION_ROUTES.designations },
  { title: "Holidays", href: ORGANIZATION_ROUTES.holidays },
] as const;

/** Focused master-data nav for Super Admin — not a full HR config dump. */
export function buildSuperAdminOrganizationSubNav(basePath: string) {
  const routes = buildOrganizationRoutes(basePath);
  return [
    { title: "Company", href: routes.profile },
    { title: "Branches", href: routes.branches },
    { title: "Departments", href: routes.departments },
    { title: "Designations", href: routes.designations },
    { title: "Locations", href: `${routes.branches}#work-locations` },
    { title: "Employment Types", href: routes.employmentTypes },
  ] as const;
}

export const ORGANIZATION_VIEW_PERMISSIONS = [
  "organization.view",
  "branch.view",
  "department.view",
  "designation.view",
  "employment_type.view",
  "holiday.view",
  "work_location.view",
  "shift_template.view",
] as const;

export const ORGANIZATION_CREATE_PERMISSIONS = [
  "organization.create",
  "branch.create",
  "department.create",
  "designation.create",
  "employment_type.create",
  "work_location.create",
  "shift_template.create",
  "holiday.manage",
] as const;

export const ORGANIZATION_EDIT_PERMISSIONS = [
  "organization.edit",
  "branch.edit",
  "department.edit",
  "designation.edit",
  "employment_type.edit",
  "work_location.edit",
  "shift_template.edit",
  "holiday.manage",
] as const;

export const ORGANIZATION_DELETE_PERMISSIONS = [
  "organization.delete",
  "branch.delete",
  "department.delete",
  "designation.delete",
  "employment_type.delete",
  "work_location.delete",
  "shift_template.delete",
] as const;

export function canViewOrganization(codes: string[]) {
  return hasAnyPermission(codes, [...ORGANIZATION_VIEW_PERMISSIONS]);
}

export function canCreateOrganization(codes: string[]) {
  return hasAnyPermission(codes, [...ORGANIZATION_CREATE_PERMISSIONS]);
}

export function canEditOrganization(codes: string[]) {
  return hasAnyPermission(codes, [...ORGANIZATION_EDIT_PERMISSIONS]);
}

export function canDeleteOrganization(codes: string[]) {
  return hasAnyPermission(codes, [...ORGANIZATION_DELETE_PERMISSIONS]);
}

export function canManageHolidays(codes: string[]) {
  return hasAnyPermission(codes, ["holiday.manage", "organization.create", "organization.edit"]);
}

export function canEditProfile(codes: string[]) {
  return hasAnyPermission(codes, ["organization.edit"]);
}
