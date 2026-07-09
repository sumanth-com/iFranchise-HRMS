import type { RecordStatus } from "@/types/auth";

export type OrganizationActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };

export type HolidayType = "national" | "state" | "company";

export type OrganizationProfile = {
  id: string;
  name: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoStoragePath: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  cin: string | null;
  registeredAddressLine1: string | null;
  registeredAddressLine2: string | null;
  registeredCity: string | null;
  registeredState: string | null;
  registeredCountry: string | null;
  registeredPostalCode: string | null;
  corporateAddressLine1: string | null;
  corporateAddressLine2: string | null;
  corporateCity: string | null;
  corporateState: string | null;
  corporateCountry: string | null;
  corporatePostalCode: string | null;
  timezone: string;
  currencyCode: string;
  dateFormat: string;
  fiscalYearStartMonth: number;
  status: RecordStatus;
};

export type OrganizationDashboardStats = {
  branches: number;
  departments: number;
  designations: number;
  workLocations: number;
  holidays: number;
  shiftTemplates: number;
  employmentTypes: number;
  employeesByDepartment: { name: string; count: number }[];
  employeesByBranch: { name: string; count: number }[];
};

export type OrgSearchResult = {
  departments: { id: string; name: string; code: string }[];
  branches: { id: string; name: string; code: string }[];
  designations: { id: string; title: string; code: string }[];
  workLocations: { id: string; name: string }[];
};

export type BranchListItem = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  branchHeadId: string | null;
  branchHeadName: string | null;
  isHeadOffice: boolean;
  status: RecordStatus;
  employeeCount: number;
  updatedAt: string;
};

export type BranchListResult = {
  data: BranchListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type DepartmentListItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  departmentHeadId: string | null;
  departmentHeadName: string | null;
  parentDepartmentId: string | null;
  parentDepartmentName: string | null;
  branchId: string | null;
  branchName: string | null;
  status: RecordStatus;
  employeeCount: number;
  updatedAt: string;
};

export type DepartmentListResult = {
  data: DepartmentListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type DesignationListItem = {
  id: string;
  title: string;
  code: string;
  departmentId: string | null;
  departmentName: string | null;
  level: number;
  description: string | null;
  status: RecordStatus;
  employeeCount: number;
  updatedAt: string;
};

export type DesignationListResult = {
  data: DesignationListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type EmploymentTypeListItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isFullTime: boolean;
  defaultHoursPerWeek: number;
  status: RecordStatus;
  employeeCount: number;
  updatedAt: string;
};

export type WorkLocationListItem = {
  id: string;
  name: string;
  branchId: string;
  branchName: string | null;
  workingDays: string[];
  officeStartTime: string;
  officeEndTime: string;
  latitude: number | null;
  longitude: number | null;
  status: RecordStatus;
  updatedAt: string;
};

export type WorkLocationListResult = {
  data: WorkLocationListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type HolidayListItem = {
  id: string;
  name: string;
  holidayDate: string;
  holidayType: HolidayType;
  branchId: string | null;
  branchName: string | null;
  isOptional: boolean;
  isRecurring: boolean;
  recurringMonth: number | null;
  recurringDay: number | null;
  applicableDepartmentIds: string[];
  applicableDepartmentNames: string[];
  description: string | null;
  status: RecordStatus;
};

export type HolidayListResult = {
  data: HolidayListItem[];
  total: number;
  page: number;
  year: number;
};

export type ShiftTemplateListItem = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  graceTimeMinutes: number;
  minimumHours: number;
  halfDayHours: number;
  status: RecordStatus;
  updatedAt: string;
};

export type HierarchyNode = {
  id: string;
  employeeCode: string;
  fullName: string;
  designationTitle: string | null;
  departmentName: string | null;
  reportingManagerId: string | null;
  children: HierarchyNode[];
};

export type HierarchyEmployee = {
  id: string;
  employeeCode: string;
  fullName: string;
  designationTitle: string | null;
  departmentName: string | null;
  reportingManagerId: string | null;
};

export type OrgListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RecordStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type OrgExportFormat = "csv" | "excel";
