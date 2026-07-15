import type { EmploymentStatus } from "@/types/auth";
import type {
  EmployeeDetail,
  EmployeeLeaveBalanceDetail,
  LookupOption,
} from "@/types/employee";
import type { HierarchyNode } from "@/types/organization";

export type CeoOrgListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  managerId?: string;
  employmentStatus?: EmploymentStatus;
  employmentTypeId?: string;
  sortBy?: "first_name" | "employee_code" | "date_of_joining" | "employment_status";
  sortOrder?: "asc" | "desc";
};

export type CeoOrgDirectoryItem = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  employmentStatus: EmploymentStatus;
  dateOfJoining: string | null;
  experienceYears: number | null;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationTitle: string | null;
  employmentTypeId: string | null;
  employmentTypeName: string | null;
  branchId: string;
  branchName: string | null;
  location: string | null;
  reportingManagerId: string | null;
  managerName: string | null;
  profileImagePath: string | null;
};

export type CeoOrgListResult = {
  data: CeoOrgDirectoryItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CeoOrgSummary = {
  totalEmployees: number;
  activeEmployees: number;
  departments: number;
  managers: number;
  teamLeads: number;
  reportingEmployees: number;
  reportingCoveragePercent: number;
  averageTeamSize: number;
};

export type CeoOrgFilterLookups = {
  departments: LookupOption[];
  managers: LookupOption[];
  employmentTypes: LookupOption[];
};

export type CeoOrgDepartmentCard = {
  id: string;
  name: string;
  headName: string | null;
  employeeCount: number;
  managerCount: number;
  attendancePercent: number;
  performanceScore: number | null;
  openPositions: number;
  averageExperienceYears: number | null;
};

export type CeoOrgWorkforceInsights = {
  departmentDistribution: { label: string; value: number }[];
  employmentTypeDistribution: { label: string; value: number }[];
  managerDistribution: { label: string; value: number }[];
  averageExperienceYears: number | null;
  newJoinersThisMonth: number;
  employeesOnNotice: number;
  employeesOnProbation: number;
};

export type CeoOrgEmployeeDetail = {
  employee: EmployeeDetail;
  profileImageUrl: string | null;
  experienceYears: number | null;
  reportingChain: { id: string; fullName: string; designationTitle: string | null }[];
  attendanceSummary: {
    totalRecords: number;
    presentDays: number;
    totalWorkHours: number;
  };
  leaveBalances: EmployeeLeaveBalanceDetail[];
  performanceRating: number | null;
  recentPromotions: {
    id: string;
    promotionStatus: string;
    recommendedDesignation: string | null;
    createdAt: string;
  }[];
  recentSalaryRevisionDate: string | null;
};

export type CeoOrganizationPageData = {
  summary: CeoOrgSummary;
  employees: CeoOrgListResult;
  lookups: CeoOrgFilterLookups;
  departments: CeoOrgDepartmentCard[];
  hierarchyRoots: HierarchyNode[];
  insights: CeoOrgWorkforceInsights;
};
