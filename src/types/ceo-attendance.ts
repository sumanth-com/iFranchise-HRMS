import type { LookupOption } from "@/types/employee";
import type { AttendanceStatus } from "@/types/attendance";

export type CeoAttendanceListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  employeeId?: string;
  departmentId?: string;
  managerId?: string;
  branchId?: string;
  employmentTypeId?: string;
  attendanceStatus?: AttendanceStatus;
  month?: number;
  year?: number;
  dateFrom?: string;
  dateTo?: string;
};

export type CeoAttendanceKpis = {
  overallAttendancePercent: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  workFromHome: number;
  lateArrivals: number;
  earlyCheckouts: number;
  averageWorkingHours: number;
  attendanceCompliancePercent: number;
  overtimeHours: number;
};

export type CeoAttendanceOverview = {
  overallAttendancePercent: number;
  monthlyAttendancePercent: number;
  yearlyAttendancePercent: number;
  attendanceTrend: { label: string; value: number }[];
  averageCheckInTime: string | null;
  averageCheckOutTime: string | null;
  averageWorkingHours: number;
};

export type CeoAttendanceDepartmentRow = {
  id: string;
  name: string;
  headName: string | null;
  employeeCount: number;
  presentPercent: number;
  latePercent: number;
  absentPercent: number;
  leavePercent: number;
  averageWorkingHours: number;
  attendanceScore: number;
};

export type CeoAttendanceEmployeeRow = {
  id: string;
  attendanceId: string | null;
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  departmentName: string | null;
  managerName: string | null;
  todayStatus: AttendanceStatus | "no_record";
  checkInAt: string | null;
  checkOutAt: string | null;
  workingHours: number;
  lateMinutes: number;
  attendancePercent: number;
  profileImagePath: string | null;
};

export type CeoAttendanceEmployeeListResult = {
  data: CeoAttendanceEmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type CeoAttendanceAnalytics = {
  attendanceTrend: { label: string; value: number }[];
  departmentComparison: { label: string; value: number }[];
  monthlyComparison: { label: string; value: number }[];
  yearlyComparison: { label: string; value: number }[];
  lateArrivalTrend: { label: string; value: number }[];
  wfhTrend: { label: string; value: number }[];
  leaveTrend: { label: string; value: number }[];
  overtimeTrend: { label: string; value: number }[];
  attendanceHeatmap: { label: string; value: number }[];
  peakAttendanceDays: { label: string; value: number }[];
};

export type CeoAttendanceExceptions = {
  frequentlyLate: { id: string; label: string; meta: string }[];
  departmentsBelowTarget: { id: string; label: string; value: number }[];
  missingCheckOuts: { id: string; label: string; meta: string }[];
  anomalies: { id: string; label: string; meta: string }[];
  highOvertime: { id: string; label: string; meta: string }[];
  lowAttendance: { id: string; label: string; meta: string }[];
};

export type CeoAttendanceCalendarItem = {
  id: string;
  date: string;
  title: string;
  type: "holiday" | "company_event" | "weekend" | "department_shutdown";
  meta: string | null;
};

export type CeoAttendanceFilterLookups = {
  employees: LookupOption[];
  departments: LookupOption[];
  managers: LookupOption[];
  locations: LookupOption[];
  employmentTypes: LookupOption[];
};

export type CeoAttendanceEmployeeDetail = {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  departmentName: string | null;
  designationTitle: string | null;
  managerName: string | null;
  profileImagePath: string | null;
  attendanceSummary: {
    presentDays: number;
    absentDays: number;
    lateDays: number;
    leaveDays: number;
    wfhDays: number;
    averageHours: number;
  };
  monthlyAttendancePercent: number;
  yearlyAttendancePercent: number;
  lateRecords: { date: string; lateMinutes: number; checkInAt: string | null }[];
  leaveSummary: { present: number; leave: number; absent: number };
  overtimeHours: number;
  attendanceTrend: { label: string; value: number }[];
  recentAttendance: {
    id: string;
    date: string;
    status: AttendanceStatus;
    checkInAt: string | null;
    checkOutAt: string | null;
    workHours: number;
  }[];
};

export type CeoAttendancePageData = {
  kpis: CeoAttendanceKpis;
  overview: CeoAttendanceOverview;
  departments: CeoAttendanceDepartmentRow[];
  employees: CeoAttendanceEmployeeListResult;
  analytics: CeoAttendanceAnalytics;
  exceptions: CeoAttendanceExceptions;
  calendar: CeoAttendanceCalendarItem[];
  lookups: CeoAttendanceFilterLookups;
};
