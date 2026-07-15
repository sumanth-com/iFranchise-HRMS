export type CeoInsightPriority = "high" | "medium" | "low";

export type CeoChartItem = {
  label: string;
  value: number;
};

export type CeoKpis = {
  totalEmployees: number;
  activeEmployees: number;
  newJoiners: number;
  employeesExiting: number;
  departments: number;
  managers: number;
  openPositions: number;
  recruitmentPipeline: number;
  pendingApprovals: number;
  attendancePercent: number;
  leavePercent: number;
  averageProductivity: number;
  payrollCost: number;
  monthlyRevenue: number | null;
  attritionRate: number;
  employeeSatisfaction: number | null;
  trainingCompletion: number;
};

export type CeoInsight = {
  id: string;
  title: string;
  description: string;
  priority: CeoInsightPriority;
  href: string | null;
};

export type CeoOrgSnapshot = {
  departmentDistribution: CeoChartItem[];
  managerDistribution: CeoChartItem[];
  hierarchyDepth: number;
  totalDepartments: number;
  totalManagers: number;
  reportingCoveragePercent: number;
};

export type CeoRecruitmentOverview = {
  openJobs: number;
  candidates: number;
  interviewsToday: number;
  offersPending: number;
  hiringThisMonth: number;
  timeToHireDays: number;
  funnel: CeoChartItem[];
};

export type CeoPerformanceOverview = {
  companyAverageRating: number;
  topPerformingDepartments: CeoChartItem[];
  lowPerformingTeams: CeoChartItem[];
  pendingReviews: number;
  promotionRecommendations: number;
};

export type CeoPayrollOverview = {
  status: string;
  completed: boolean;
  pending: boolean;
  salaryCost: number;
  benefitsCost: number;
  upcomingPayrollDate: string | null;
  monthlyTrend: CeoChartItem[];
};

export type CeoAttendanceOverview = {
  presentPercent: number;
  absentPercent: number;
  latePercent: number;
  workFromHome: number;
  officeAttendance: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
};

export type CeoActivityItem = {
  id: string;
  title: string;
  description: string;
  module: string;
  occurredAt: string;
  href: string | null;
};

export type CeoApprovalItem = {
  id: string;
  kind:
    | "senior_hiring"
    | "payroll"
    | "promotion"
    | "department"
    | "policy"
    | "manager_creation"
    | "high_leave";
  title: string;
  subtitle: string;
  meta: string;
  priority: CeoInsightPriority;
  href: string | null;
};

export type CeoDashboardCharts = {
  employeeGrowth: CeoChartItem[];
  hiringTrend: CeoChartItem[];
  attendanceTrend: CeoChartItem[];
  attritionTrend: CeoChartItem[];
  payrollTrend: CeoChartItem[];
  departmentGrowth: CeoChartItem[];
};

export type CeoDashboardData = {
  generatedAt: string;
  kpis: CeoKpis;
  insights: CeoInsight[];
  organization: CeoOrgSnapshot;
  recruitment: CeoRecruitmentOverview;
  performance: CeoPerformanceOverview;
  payroll: CeoPayrollOverview;
  attendance: CeoAttendanceOverview;
  activities: CeoActivityItem[];
  approvals: CeoApprovalItem[];
  charts: CeoDashboardCharts;
};
