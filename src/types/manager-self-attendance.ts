import type { AttendanceStatus } from "@/types/attendance";
import type { EmploymentStatus } from "@/types/auth";
import type { CorrectionStatus } from "@/types/manager-attendance";
import type { EmployeeAccountStatus } from "@/types/employee";

export type ManagerAttendancePunchState =
  | "not_checked_in"
  | "checked_in"
  | "checked_out"
  | "locked";

export type ManagerTodayAttendance = {
  attendanceId: string | null;
  attendanceDate: string;
  punchState: ManagerAttendancePunchState;
  attendanceStatus: AttendanceStatus | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  workHours: number;
  overtimeHours: number;
  lateMinutes: number;
  isLocked: boolean;
  lockMessage: string | null;
  workingDurationLabel: string;
};

export type ManagerAttendanceCalendarDay = {
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  status: AttendanceStatus | null;
  attendanceId: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  workHours: number;
  holidayName: string | null;
  leaveTypeName: string | null;
};

export type ManagerProfileCardData = {
  employeeId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  designation: string | null;
  departmentName: string | null;
  employmentTypeName: string;
  employmentStatus: EmploymentStatus;
  accountStatus: EmployeeAccountStatus;
  reportingTo: string | null;
  joiningDate: string | null;
  email: string;
  phone: string | null;
  imageUrl: string | null;
  profilePath: string;
};

export type ManagerAttendanceMonthSummary = {
  workingDays: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  halfDay: number;
  weekend: number;
  holiday: number;
  averageWorkingHours: number;
  averageCheckIn: string | null;
  averageCheckOut: string | null;
  overtimeHours: number;
  currentStreak: number;
  bestStreak: number;
};

export type ManagerAttendanceHistoryRow = {
  id: string | null;
  attendanceDate: string;
  attendanceStatus: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  workHours: number;
  lateMinutes: number;
  overtimeHours: number;
  remarks: string | null;
  correctionStatus: CorrectionStatus | null;
  correctionId: string | null;
  canUpdateCheckout: boolean;
  canRequestRegularization: boolean;
};

export type ManagerAttendanceHistoryResult = {
  data: ManagerAttendanceHistoryRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type ManagerProfilePageData = {
  today: ManagerTodayAttendance;
  calendarDays: ManagerAttendanceCalendarDay[];
  profileCard: ManagerProfileCardData;
  summary: ManagerAttendanceMonthSummary;
  history: ManagerAttendanceHistoryResult;
  month: number;
  year: number;
  selectedDate: string | null;
  selectedDay: ManagerAttendanceCalendarDay | null;
};
