import type { AttendanceStatus } from "@/types/attendance";
import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

export type EmployeeGreeting = {
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  employeeCode: string;
  designation: string | null;
  departmentName: string | null;
  avatarUrl: string | null;
};

export type EmployeeDashboardKpis = {
  attendanceStatus: AttendanceStatus | null;
  attendancePunchState: ManagerTodayAttendance["punchState"];
  workingHours: number;
  leaveBalanceDays: number;
  pendingLeaveRequests: number;
};

export type EmployeeUpcomingEventType =
  | "holiday"
  | "birthday"
  | "anniversary"
  | "announcement";

export type EmployeeUpcomingEvent = {
  id: string;
  type: EmployeeUpcomingEventType;
  title: string;
  subtitle: string | null;
  date: string;
  avatarUrl?: string | null;
  profileImagePath?: string | null;
  firstName?: string;
  lastName?: string;
  /** Announcement-only fields */
  message?: string | null;
  priority?: "normal" | "important";
  imageUrl?: string | null;
  iconKey?: string | null;
};

export type EmployeeDashboardData = {
  greeting: EmployeeGreeting;
  today: ManagerTodayAttendance;
  kpis: EmployeeDashboardKpis;
  referenceDate: string;
  upcomingHolidays: EmployeeUpcomingEvent[];
  canManageAnnouncements?: boolean;
};

export type EmployeeAttendanceActionResult =
  | { success: true }
  | { success: false; message: string };
