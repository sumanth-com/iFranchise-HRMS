import { hasAnyPermission } from "@/lib/permissions/utils";

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

export const ORGANIZATION_SUB_NAV = [
  { title: "Dashboard", href: ORGANIZATION_ROUTES.dashboard },
  { title: "Company Profile", href: ORGANIZATION_ROUTES.profile },
  { title: "Branches", href: ORGANIZATION_ROUTES.branches },
  { title: "Departments", href: ORGANIZATION_ROUTES.departments },
  { title: "Designations", href: ORGANIZATION_ROUTES.designations },
  { title: "Employment Types", href: ORGANIZATION_ROUTES.employmentTypes },
  { title: "Work Locations", href: ORGANIZATION_ROUTES.workLocations },
  { title: "Holidays", href: ORGANIZATION_ROUTES.holidays },
  { title: "Shift Templates", href: ORGANIZATION_ROUTES.shifts },
  { title: "Hierarchy", href: ORGANIZATION_ROUTES.hierarchy },
] as const;

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
