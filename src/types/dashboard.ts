export type DashboardChartItem = {
  label: string;
  value: number;
};

export type DashboardPersonEvent = {
  id: string;
  name: string;
  date: string;
  subtitle: string | null;
  href: string;
};

export type DashboardActivityItem = {
  id: string;
  title: string;
  description: string;
  module: string;
  user: string;
  occurredAt: string;
  href: string | null;
};

export type DashboardTaskItem = {
  id: string;
  label: string;
  count: number | null;
  href: string;
  urgency: "high" | "medium" | "low";
};

export type DashboardListItem = {
  id: string;
  primary: string;
  secondary: string;
  meta: string;
  href: string;
};

/** Executive dashboard KPIs — workforce snapshot only (no Priority Task overlap). */
export type DashboardKpis = {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  absentToday: number;
  pendingLeaveApprovals: number;
};

export type DashboardSecondaryMetrics = {
  attendancePercent: number;
  leaveUtilizationPercent: number;
  payrollStatus: string;
  upcomingBirthdaysCount: number;
  upcomingAnniversariesCount: number;
  probationEndingSoon: number;
  documentsExpiring: number;
  assetsPendingReturn: number;
  interviewsToday: number;
  birthdaysToday: number;
  exitClearancePending: number;
};

export type DashboardCharts = {
  headcountByDepartment: DashboardChartItem[];
  attendanceTrend7Days: DashboardChartItem[];
  monthlyHiring: DashboardChartItem[];
  monthlyAttrition: DashboardChartItem[];
  leaveDistribution: DashboardChartItem[];
  genderDistribution: DashboardChartItem[];
  employmentTypeDistribution: DashboardChartItem[];
};

export type HrDashboardData = {
  generatedAt: string;
  kpis: DashboardKpis;
  secondary: DashboardSecondaryMetrics;
  charts: DashboardCharts;
  activities: DashboardActivityItem[];
  tasks: DashboardTaskItem[];
  upcomingBirthdays: DashboardPersonEvent[];
  upcomingAnniversaries: DashboardPersonEvent[];
  upcomingInterviews: DashboardListItem[];
  upcomingHolidays: DashboardListItem[];
  recentEmployees: DashboardListItem[];
  recentLeaveRequests: DashboardListItem[];
  recentRecruitment: DashboardListItem[];
  recentPayrollRuns: DashboardListItem[];
};
