import type { CeoChartItem, CeoInsightPriority } from "@/types/ceo-dashboard";
import type {
  HalfDayPeriod,
  LeaveApprovalStep,
  LeaveEmployeeBalanceSnapshot,
  LeaveHolidayEntry,
  LeaveCalendarEntry,
  LeaveLookups,
  LeaveStatus,
} from "@/types/leave";

export type CeoLeaveFilters = {
  departmentId?: string;
  branchId?: string;
  leaveTypeId?: string;
  leaveStatus?: LeaveStatus;
  reportingManagerId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type CeoLeaveSummary = {
  employeesOnLeaveToday: number;
  upcomingLeaves: number;
  pendingCeoApprovals: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  leaveUtilizationPercent: number;
};

/** A leave row enriched with the employee's reporting manager (for CEO tables). */
export type CeoLeaveRecord = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentId: string | null;
  departmentName: string | null;
  branchId: string | null;
  branchName: string | null;
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
  managerName: string | null;
  currentApprovalLevel: number | null;
  currentApproverName: string | null;
};

/** A leave request whose active pending approver is the CEO. */
export type CeoApprovalQueueItem = CeoLeaveRecord & {
  approvalRecordId: string;
  submittedAt: string;
};

export type CeoDepartmentLeaveOverview = {
  departmentId: string;
  departmentName: string;
  totalEmployees: number;
  employeesOnLeave: number;
  leavePercent: number;
  availabilityPercent: number;
};

export type CeoLeaveInsight = {
  id: string;
  priority: CeoInsightPriority;
  message: string;
};

export type CeoForwardTarget = {
  id: string;
  label: string;
  roleLabel: string;
};

export type CeoLeaveAnalytics = {
  monthlyTrend: CeoChartItem[];
  departmentDistribution: CeoChartItem[];
  leaveTypeDistribution: CeoChartItem[];
  averageApprovalHours: number | null;
  averageLeaveDurationDays: number | null;
};

export type CeoLeaveCalendar = {
  month: number;
  year: number;
  leaves: LeaveCalendarEntry[];
  holidays: LeaveHolidayEntry[];
};

export type CeoLeaveDetail = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  branchName: string | null;
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
  balances: LeaveEmployeeBalanceSnapshot[];
  /** True only when this leave is a pending approval assigned to the CEO. */
  canAct: boolean;
};

export type CeoLeaveModuleData = {
  summary: CeoLeaveSummary;
  todaysLeave: CeoLeaveRecord[];
  upcomingLeave: CeoLeaveRecord[];
  approvalQueue: CeoApprovalQueueItem[];
  departmentOverview: CeoDepartmentLeaveOverview[];
  insights: CeoLeaveInsight[];
  analytics: CeoLeaveAnalytics;
  calendar: CeoLeaveCalendar;
  lookups: LeaveLookups;
  forwardTargets: CeoForwardTarget[];
  ceoEmployeeId: string;
};

export type CeoLeaveActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };
