import type { LookupOption } from "@/types/employee";

export type LeaveStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "withdrawn";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "skipped";

export type HalfDayPeriod = "morning" | "afternoon";

export type LeaveListItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentId: string | null;
  departmentName: string | null;
  designationId?: string | null;
  designationName?: string | null;
  branchId: string | null;
  branchName: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  halfDayPeriod: HalfDayPeriod | null;
  reason: string | null;
  leaveStatus: LeaveStatus;
  appliedAt: string;
  approverName: string | null;
  currentApprovalLevel: number | null;
  /** Stored duration breakdown when available (day-level history). */
  durationBreakdown?: unknown;
  pendingApproverEmployeeId?: string | null;
  canActOnApproval?: boolean;
  canActOnRejection?: boolean;
  hrReviewRequired?: boolean;
  hrDecision?: "lop" | "special" | null;
  hrRemarks?: string | null;
  availableBalanceAtSubmit?: number | null;
};

export type LeaveListResult = {
  data: LeaveListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type LeaveSortField =
  | "employee_code"
  | "start_date"
  | "end_date"
  | "total_days"
  | "created_at"
  | "leave_status";

export type LeaveListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: LeaveSortField;
  sortOrder?: "asc" | "desc";
  month?: number;
  year?: number;
  leaveStatus?: LeaveStatus | "pending_hr_review";
  leaveTypeId?: string;
  departmentId?: string;
  branchId?: string;
  approverId?: string;
  employmentTypeId?: string;
  reportingManagerId?: string;
  employeeId?: string;
  employmentStatus?: string;
  isHalfDay?: boolean;
  dateFrom?: string;
  dateTo?: string;
  createdByEmployeeId?: string;
  /** When true, omit leave from HR applicants (CEO-only approval queue). */
  excludeHrApplicants?: boolean;
  summaryFilter?:
    | "pendingRequests"
    | "pendingHrReview"
    | "approvedThisMonth"
    | "rejectedThisMonth"
    | "employeesOnLeaveToday"
    | "upcomingPlannedLeaves";
};

export type LeaveSummary = {
  pendingRequests: number;
  pendingHrReview?: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  employeesOnLeaveToday: number;
  balanceUtilizationPercent: number;
  upcomingPlannedLeaves: number;
};

export type LeaveBalanceItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  balanceYear: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  balanceDays: number;
};

export type LeaveApprovalStep = {
  id: string;
  approvalLevel: number;
  approverEmployeeId: string;
  approverName: string;
  approvalStatus: ApprovalStatus;
  comments: string | null;
  actedAt: string | null;
  actedVia: "portal" | "email";
};

export type LeaveDetail = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  branchName: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  durationBreakdown?: import("@/lib/leave/services/leave-calendar-engine").LeaveDurationBreakdown | null;
  isHalfDay: boolean;
  halfDayPeriod: HalfDayPeriod | null;
  reason: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  attachmentPath: string | null;
  leaveStatus: LeaveStatus;
  appliedAt: string;
  updatedAt: string;
  approvals: LeaveApprovalStep[];
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canEdit: boolean;
  canDelete: boolean;
  employmentTypeName?: string | null;
  hrReviewRequired?: boolean;
  hrReviewReason?: "balance_exhausted" | "over_limit" | null;
  hrDecision?: "lop" | "special" | null;
  hrRemarks?: string | null;
  availableBalanceAtSubmit?: number | null;
};

export type LeaveCalendarEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeName: string;
  leaveTypeCode?: string | null;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  leaveStatus: LeaveStatus;
  hrReviewRequired?: boolean;
  hrDecision?: "lop" | "special" | null;
  dayAllocations?: Array<{
    date: string;
    kind: "paid" | "lop" | "sandwich" | "none";
    counted: number;
  }>;
};

export type LeaveHolidayEntry = {
  id: string;
  name: string;
  holidayDate: string;
  isOptional: boolean;
};

export type LeaveEmployeeBalanceSnapshot = {
  leaveTypeCode: string;
  leaveTypeName: string;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  balanceDays: number;
  /** Days taken in the selected calendar month (approved + pending). */
  monthUsedDays: number;
  /** Monthly quota display — kept for apply-leave context. */
  monthTotalDays: number;
  /** Days taken in the balance year to date (approved + pending). */
  yearTakenDays: number;
};

export type LeaveLookups = {
  leaveTypes: LookupOption[];
  departments: LookupOption[];
  branches: LookupOption[];
  employees: LookupOption[];
  managers: LookupOption[];
  approvers: LookupOption[];
  employmentTypes: LookupOption[];
};

export type LeaveApplyContext = {
  calendar: import("@/lib/leave/services/leave-calendar-engine").LeaveCalendarContext;
  employee: import("@/lib/leave/services/leave-policy-engine").LeaveEmployeePolicyState;
  probation: import("@/lib/leave/services/leave-policy-engine").LeaveProbationSnapshot;
  probationRules: import("@/lib/leave/services/leave-policy-engine").LeaveProbationRules;
  notice: import("@/lib/leave/services/leave-policy-engine").LeavePolicyNoticeHours;
  allowHalfDay: boolean;
  maxConsecutiveDays: number;
  approvalLevels: number;
  leaveTypes: Array<{
    id: string;
    code: string;
    name: string;
    isPaid: boolean;
  }>;
  balances: LeaveEmployeeBalanceSnapshot[];
  policyDocument: import("@/types/leave-policy").LeavePolicyDocument;
  /** Role codes for the employee applying leave — drives approval copy. */
  applicantRoleCodes: string[];
  optionalHolidays?: Array<{
    id: string;
    name: string;
    date: string;
    day: string;
    status: "available" | "pending" | "approved" | "passed";
  }>;
};

export type LeaveActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };
