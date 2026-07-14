import type { AttendanceStatus } from "@/types/attendance";
import type { LookupOption } from "@/types/employee";

export type CorrectionStatus = "pending" | "approved" | "rejected" | "cancelled";

export type TeamAttendanceListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?:
    | "employee_code"
    | "attendance_date"
    | "check_in_at"
    | "check_out_at"
    | "work_hours"
    | "attendance_status";
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  employmentTypeId?: string;
  attendanceStatus?: AttendanceStatus;
  employeeId?: string;
};

export type TeamAttendanceMonitoringFlags = {
  isLate: boolean;
  isEarlyExit: boolean;
  missingCheckIn: boolean;
  missingCheckOut: boolean;
};

export type TeamAttendanceListItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationTitle: string | null;
  branchId: string;
  branchName: string | null;
  employmentTypeName: string | null;
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workHours: number;
  breakMinutes: number;
  overtimeHours: number;
  attendanceStatus: AttendanceStatus;
  lateMinutes: number;
  correctionId: string | null;
  correctionStatus: CorrectionStatus | null;
  monitoring: TeamAttendanceMonitoringFlags;
  isWorkFromHome: boolean;
};

export type TeamAttendanceListResult = {
  data: TeamAttendanceListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type TeamAttendanceSummary = {
  dateLabel: string;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  halfDayToday: number;
  workFromHomeToday: number;
  pendingRegularizations: number;
};

export type TeamAttendanceFilterLookups = {
  departments: LookupOption[];
  employmentTypes: LookupOption[];
  teamMembers: LookupOption[];
};

export type TeamAttendanceCorrectionDetail = {
  id: string;
  attendanceId: string;
  employeeId: string;
  reason: string;
  correctionStatus: CorrectionStatus;
  requestedCheckInAt: string | null;
  requestedCheckOutAt: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type TeamAttendanceDetailBundle = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeEmail: string | null;
  departmentName: string | null;
  designationTitle: string | null;
  employmentTypeName: string | null;
  branchName: string | null;
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workHours: number;
  breakMinutes: number;
  overtimeHours: number;
  attendanceStatus: AttendanceStatus;
  lateMinutes: number;
  notes: string | null;
  locationLabel: string | null;
  deviceLabel: string | null;
  correction: TeamAttendanceCorrectionDetail | null;
  history: Array<{
    id: string;
    attendanceDate: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    workHours: number;
    attendanceStatus: AttendanceStatus;
  }>;
  monitoring: TeamAttendanceMonitoringFlags;
};

export type TeamMonthlyAttendanceRow = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
  wfhDays: number;
  lateDays: number;
  averageWorkingHours: number;
};

export type ManagerTeamAttendancePageData = {
  summary: TeamAttendanceSummary;
  records: TeamAttendanceListResult;
  lookups: TeamAttendanceFilterLookups;
  monthlySummary: TeamMonthlyAttendanceRow[];
};
