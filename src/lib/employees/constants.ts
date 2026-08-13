import { buildEmployeeRouteRef } from "@/lib/employees/routing";
import type { EmployeeRouteIdentity } from "@/types/employee";

export const EMPLOYEE_ROUTES = {
  list: "/dashboard/employees",
  new: "/dashboard/employees/new",
  detail: (employee: EmployeeRouteIdentity) =>
    `/dashboard/employees/${buildEmployeeRouteRef(employee)}`,
  edit: (employee: EmployeeRouteIdentity) =>
    `/dashboard/employees/${buildEmployeeRouteRef(employee)}/edit`,
} as const;

/** Build employee module routes under an alternate portal base (e.g. Super Admin). */
export function buildEmployeeModuleRoutes(basePath: string) {
  const base = basePath.replace(/\/$/, "") || EMPLOYEE_ROUTES.list;
  return {
    list: base,
    new: `${base}/new`,
    detail: (employee: EmployeeRouteIdentity) =>
      `${base}/${buildEmployeeRouteRef(employee)}`,
    edit: (employee: EmployeeRouteIdentity) =>
      `${base}/${buildEmployeeRouteRef(employee)}/edit`,
  } as const;
}

export type EmployeeModuleRoutes = {
  list: string;
  new: string;
  detail: (employee: EmployeeRouteIdentity) => string;
  edit: (employee: EmployeeRouteIdentity) => string;
};

/** Resolve module routes on the client from a serializable base path (safe across RSC → client). */
export function resolveEmployeeModuleRoutes(
  routesBasePath?: string | null,
): EmployeeModuleRoutes {
  if (!routesBasePath || routesBasePath === EMPLOYEE_ROUTES.list) {
    return EMPLOYEE_ROUTES;
  }
  return buildEmployeeModuleRoutes(routesBasePath);
}

export const EMPLOYEE_STORAGE_BUCKETS = {
  documents: "employee-documents",
  profileImages: "employee-profile-images",
} as const;

/** Max profile photo upload size (must match storage bucket limit). */
export const PROFILE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** Max non-profile document upload size (must match storage bucket limit). */
export const DOCUMENT_MAX_BYTES = 30 * 1024 * 1024;
export const DOCUMENT_MAX_MB = 30;

export const DESIGNATION_OTHER_VALUE = "others" as const;

export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  probation: "Probation",
  active: "Active",
  on_leave: "On Leave",
  suspended: "Suspended",
  terminated: "Terminated",
  resigned: "Resigned",
};

export const EMPLOYEE_ACCOUNT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  invited: "Invited",
  invitation_pending: "Invitation Pending",
  invitation_accepted: "Invitation Accepted",
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  archived: "Archived",
};

export const EMPLOYEE_TABS = [
  "overview",
  "documents",
  "assets",
  "attendance",
  "leave",
  "payroll",
] as const;

export type EmployeeTab = (typeof EMPLOYEE_TABS)[number];

export const EMPLOYEE_TAB_LABELS: Record<EmployeeTab, string> = {
  overview: "Profile",
  documents: "Documents",
  assets: "Assets",
  attendance: "Attendance",
  leave: "Leave",
  payroll: "Payroll",
};

export const WIZARD_STEPS = [
  { id: 1, key: "basic", label: "Basic Details" },
  { id: 2, key: "employment", label: "Employment Details" },
  { id: 3, key: "address", label: "Address" },
  { id: 4, key: "emergency", label: "Emergency Contact" },
  { id: 5, key: "documents", label: "Documents" },
  { id: 6, key: "review", label: "Review & Submit" },
] as const;
