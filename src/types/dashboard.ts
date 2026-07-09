import type { ChartSeriesItem } from "@/types/reports";

export type DashboardPermissions = {
  employees: boolean;
  attendance: boolean;
  leave: boolean;
  payroll: boolean;
  performance: boolean;
  recruitment: boolean;
  documents: boolean;
  assets: boolean;
  exit: boolean;
  reports: boolean;
  audit: boolean;
  organization: boolean;
};

export type DashboardKpis = {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  absentToday: number;
  lateToday: number;
  newJoinersThisMonth: number;
  employeesExiting: number;
  openRecruitments: number;
  pendingApprovals: number;
};

export type DashboardSecondaryMetrics = {
  attendancePercent: number;
  leaveUtilizationPercent: number;
  payrollStatus: string | null;
  upcomingBirthdays: number;
  upcomingAnniversaries: number;
  probationEndingSoon: number;
  documentsExpiring: number;
  assetsPendingReturn: number;
};

export type DashboardActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  occurredAt: string;
  module: string;
  href: string;
};

export type DashboardTaskItem = {
  id: string;
  title: string;
  subtitle?: string;
  priority: "low" | "medium" | "high" | "critical";
  href: string;
};

export type DashboardEventItem = {
  id: string;
  title: string;
  date: string;
  type: "birthday" | "anniversary" | "interview" | "holiday";
  subtitle?: string;
  href: string;
};

export type DashboardListEmployee = {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  joinedAt: string;
  href: string;
};

export type DashboardLeaveRequest = {
  id: string;
  employeeName: string;
  leaveType: string;
  days: number;
  status: string;
  startDate: string;
  href: string;
};

export type DashboardRecruitmentActivity = {
  id: string;
  title: string;
  candidateName: string;
  createdAt: string;
  href: string;
};

export type DashboardPayrollRun = {
  id: string;
  month: string;
  status: string;
  net: number;
  processedAt: string | null;
  href: string;
};

export type HrDashboardData = {
  userName: string;
  permissions: DashboardPermissions;
  kpis: DashboardKpis;
  secondary: DashboardSecondaryMetrics;
  activities: DashboardActivityItem[];
  tasks: DashboardTaskItem[];
  charts: {
    headcountByDepartment: ChartSeriesItem[];
    attendanceTrend7Day: ChartSeriesItem[];
    monthlyHiring: ChartSeriesItem[];
    monthlyAttrition: ChartSeriesItem[];
    leaveDistribution: ChartSeriesItem[];
    genderDistribution: ChartSeriesItem[];
    employmentTypeDistribution: ChartSeriesItem[];
  };
  upcomingEvents: DashboardEventItem[];
  recentEmployees: DashboardListEmployee[];
  recentLeaveRequests: DashboardLeaveRequest[];
  recentRecruitment: DashboardRecruitmentActivity[];
  recentPayrollRuns: DashboardPayrollRun[];
};
