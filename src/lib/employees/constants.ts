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

export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  probation: "Probation",
  active: "Active",
  on_leave: "On Leave",
  suspended: "Suspended",
  terminated: "Terminated",
  resigned: "Resigned",
};

export const EMPLOYEE_TABS = [
  "overview",
  "profile",
  "employment",
  "address",
  "emergency",
  "documents",
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
