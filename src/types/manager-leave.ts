import type {
  LeaveCalendarEntry,
  LeaveEmployeeBalanceSnapshot,
  LeaveHolidayEntry,
  LeaveListItem,
  LeaveListResult,
  LeaveStatus,
} from "@/types/leave";
import type { LookupOption } from "@/types/employee";

export type ManagerLeaveWorkflowStatus =
  | "pending"
  | "approved_by_manager"
  | "rejected_by_manager"
  | "sent_to_hr"
  | "completed";

export type TeamLeaveListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?:
    | "employee_code"
    | "start_date"
    | "end_date"
    | "total_days"
    | "created_at"
    | "leave_status";
  sortOrder?: "asc" | "desc";
  leaveStatus?: LeaveStatus;
  leaveTypeId?: string;
  departmentId?: string;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type TeamLeaveListItem = LeaveListItem & {
  workflowStatus: ManagerLeaveWorkflowStatus;
  hasConflicts: boolean;
};

export type TeamLeaveListResult = Omit<LeaveListResult, "data"> & {
  data: TeamLeaveListItem[];
};

export type TeamLeaveSummary = {
  pendingRequests: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  employeesOnLeaveToday: number;
  upcomingPlannedLeaves: number;
  leaveConflicts: number;
};

export type TeamLeaveConflict = {
  type:
    | "team_overlap"
    | "critical_role"
    | "dept_staffing"
    | "public_holiday"
    | "weekend";
  message: string;
  severity: "warning" | "info";
};

export type TeamLeaveFilterLookups = {
  leaveTypes: LookupOption[];
  departments: LookupOption[];
  employees: LookupOption[];
};

export type TeamLeaveDetailBundle = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeEmail: string | null;
  departmentName: string | null;
  designationTitle: string | null;
  managerName: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  halfDayPeriod: "morning" | "afternoon" | null;
  reason: string | null;
  attachmentPath: string | null;
  leaveStatus: LeaveStatus;
  workflowStatus: ManagerLeaveWorkflowStatus;
  appliedAt: string;
  balances: LeaveEmployeeBalanceSnapshot[];
  conflicts: TeamLeaveConflict[];
  canApprove: boolean;
  canReject: boolean;
  canRequestInfo: boolean;
  timeline: Array<{
    id: string;
    label: string;
    status: "completed" | "pending" | "rejected" | "upcoming";
    actorName: string;
    comments: string | null;
    actedAt: string | null;
  }>;
};

export type ManagerTeamLeavePageData = {
  summary: TeamLeaveSummary;
  records: TeamLeaveListResult;
  lookups: TeamLeaveFilterLookups;
  calendar: {
    leaves: LeaveCalendarEntry[];
    holidays: LeaveHolidayEntry[];
    month: number;
    year: number;
  };
};
