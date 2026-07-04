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
  leaveStatus?: LeaveStatus;
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
};

export type LeaveSummary = {
  pendingRequests: number;
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
};

export type LeaveCalendarEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  leaveStatus: LeaveStatus;
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

export type LeaveActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };
