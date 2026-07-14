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

export const EMPLOYEE_STORAGE_BUCKETS = {
  documents: "employee-documents",
  profileImages: "employee-profile-images",
} as const;

/** Max profile photo upload size (must match storage bucket limit). */
export const PROFILE_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

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
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
};

export const EMPLOYEE_TABS = [
  "overview",
  "account",
  "profile",
  "employment",
  "address",
  "emergency",
  "documents",
  "assets",
  "attendance",
  "leave",
  "payroll",
  "timeline",
] as const;

export type EmployeeTab = (typeof EMPLOYEE_TABS)[number];

export const WIZARD_STEPS = [
  { id: 1, key: "basic", label: "Basic Details" },
  { id: 2, key: "employment", label: "Employment Details" },
  { id: 3, key: "address", label: "Address" },
  { id: 4, key: "emergency", label: "Emergency Contact" },
  { id: 5, key: "documents", label: "Documents" },
  { id: 6, key: "review", label: "Review & Submit" },
] as const;
