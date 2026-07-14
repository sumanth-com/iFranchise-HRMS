import type { ChartSeriesItem, ReportFilters, ReportResult, ReportsLookups } from "@/types/reports";
import type { ManagerReportCategory } from "@/lib/manager/reports/manager-report-definitions";

export type ManagerReportsListParams = ReportFilters & {
  category?: ManagerReportCategory;
};

export type ManagerReportsSummary = {
  teamHeadcount: number;
  averageAttendancePercent: number;
  leaveUtilizationPercent: number;
  performanceScore: number;
  openRecruitment: number;
  attritionRisk: number;
};

export type ManagerReportsTrends = {
  attendanceTrend: ChartSeriesItem[];
  leaveTrend: ChartSeriesItem[];
  performanceTrend: ChartSeriesItem[];
  hiringTrend: ChartSeriesItem[];
  teamGrowthTrend: ChartSeriesItem[];
};

export type ManagerReportMetric = {
  label: string;
  value: string | number;
  suffix?: string;
};

export type ManagerCategoryReportBundle = {
  category: ManagerReportCategory;
  metrics: ManagerReportMetric[];
};

export type ManagerTrainingReportSummary = {
  completedTrainings: number;
  pendingTrainings: number;
  mandatoryCompletionPercent: number;
  certificationsOnFile: number;
};

export type ManagerTeamReportSummary = {
  activeMembers: number;
  onProbation: number;
  onLeaveToday: number;
  newJoinersThisMonth: number;
  pendingApprovals: number;
};

export type ManagerReportsPageData = {
  summary: ManagerReportsSummary;
  trends: ManagerReportsTrends;
  categoryBundles: ManagerCategoryReportBundle[];
  trainingSummary: ManagerTrainingReportSummary;
  teamSummary: ManagerTeamReportSummary;
  lookups: ReportsLookups;
  teamEmployeeIds: string[];
};

export type ManagerScopedReportContext = {
  teamEmployeeIds: string[];
  recruitmentDepartmentIds: string[];
};
