import type { EmploymentStatus } from "@/types/auth";
import type {
  EmployeeDetail,
  EmployeeLeaveBalanceDetail,
  EmployeeLeaveRequestDetail,
  LookupOption,
} from "@/types/employee";
import type { AssetAssignmentItem } from "@/types/assets";
import type { HierarchyNode } from "@/types/organization";

export type TeamListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  designationId?: string;
  employmentStatus?: EmploymentStatus;
  employmentTypeId?: string;
  sortBy?: "first_name" | "employee_code" | "date_of_joining" | "employment_status";
  sortOrder?: "asc" | "desc";
};

export type TeamMemberListItem = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  employmentStatus: EmploymentStatus;
  dateOfJoining: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationTitle: string | null;
  employmentTypeId: string | null;
  employmentTypeName: string | null;
  branchId: string;
  branchName: string | null;
  workLocationName: string | null;
  reportingManagerId: string | null;
  managerName: string | null;
  profileImagePath: string | null;
  attendanceToday: string | null;
  leaveBalanceDays: number;
  currentStatus: string;
};

export type TeamListResult = {
  data: TeamMemberListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type TeamSummary = {
  totalTeamMembers: number;
  presentToday: number;
  onLeaveToday: number;
  probationEmployees: number;
  upcomingBirthdays: number;
  teamCompletionRate: number;
};

export type TeamFilterLookups = {
  departments: LookupOption[];
  designations: LookupOption[];
  employmentTypes: LookupOption[];
};

export type TeamMemberDetailBundle = {
  employee: EmployeeDetail;
  profileImageUrl: string | null;
  attendance: Array<Record<string, unknown>>;
  leaveRequests: EmployeeLeaveRequestDetail[];
  leaveBalances: EmployeeLeaveBalanceDetail[];
  attendanceSummary: {
    totalRecords: number;
    presentDays: number;
    totalWorkHours: number;
  };
  assets: AssetAssignmentItem[];
  reviews: Array<{
    id: string;
    cycleName: string | null;
    reviewStatus: string;
    reviewStage: string;
    overallRating: number | null;
    submittedAt: string | null;
  }>;
  feedback: Array<{
    id: string;
    feedbackType: string;
    message: string;
    fromEmployeeName: string | null;
    createdAt: string;
  }>;
  oneOnOnes: Array<{
    id: string;
    scheduledAt: string;
    meetingStatus: string;
    agenda: string | null;
  }>;
  promotions: Array<{
    id: string;
    promotionStatus: string;
    recommendedDesignation: string | null;
    createdAt: string;
  }>;
};

export type TeamPendingLeaveApproval = {
  id: string;
  leaveRequestId: string;
  employeeId: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
};

export type TeamPendingCorrection = {
  id: string;
  employeeId: string;
  employeeName: string;
  attendanceDate: string | null;
  reason: string;
  createdAt: string;
};

export type ManagerTeamPageData = {
  summary: TeamSummary;
  employees: TeamListResult;
  lookups: TeamFilterLookups;
  hierarchyRoot: HierarchyNode | null;
  teamMemberOptions: LookupOption[];
  designationOptions: LookupOption[];
};
