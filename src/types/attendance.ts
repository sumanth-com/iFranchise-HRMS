import type { LookupOption } from "@/types/employee";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "half_day"
  | "late"
  | "on_leave"
  | "holiday"
  | "week_off";

export type AttendanceListItem = {
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
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workHours: number;
  overtimeHours: number;
  attendanceStatus: AttendanceStatus;
};

export type AttendanceListResult = {
  data: AttendanceListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AttendanceSortField =
  | "employee_code"
  | "attendance_date"
  | "check_in_at"
  | "check_out_at"
  | "work_hours"
  | "attendance_status";

export type AttendanceListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: AttendanceSortField;
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  departmentId?: string;
  attendanceStatus?: AttendanceStatus;
  employeeId?: string;
};

export type AttendanceSummary = {
  date: string;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  halfDayToday: number;
  onLeaveToday: number;
  totalEmployees: number;
};

export type AttendanceAuditActor = {
  userId: string;
  employeeName: string | null;
};

export type AttendanceDetail = {
  id: string;
  organizationId: string;
  branchId: string;
  branchName: string | null;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeEmail: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationTitle: string | null;
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  attendanceStatus: AttendanceStatus;
  workHours: number;
  overtimeHours: number;
  lateMinutes: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: AttendanceAuditActor | null;
  updatedBy: AttendanceAuditActor | null;
};

export type AttendanceLookups = {
  branches: LookupOption[];
  departments: LookupOption[];
  employees: LookupOption[];
};

export type AttendanceActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };
