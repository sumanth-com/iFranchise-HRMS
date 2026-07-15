import type { LookupOption } from "@/types/employee";

export type CeoAnalyticsCompareMode =
  | "none"
  | "previous_month"
  | "previous_quarter"
  | "previous_year"
  | "department";

export type CeoAnalyticsListParams = {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  branchId?: string;
  managerId?: string;
  employmentTypeId?: string;
  compareMode?: CeoAnalyticsCompareMode;
  compareDepartmentId?: string;
  comparePreviousPeriod?: boolean;
};

export type CeoAnalyticsChartItem = {
  label: string;
  value: number;
};

export type CeoAnalyticsKpis = {
  companyHealthScore: number;
  workforceGrowthPercent: number;
  employeeRetentionRate: number;
  attritionRate: number;
  hiringSuccessRate: number;
  attendanceCompliancePercent: number;
  performanceIndex: number;
  payrollGrowthPercent: number;
  goalAchievementPercent: number;
  employeeSatisfaction: number | null;
  previous?: Partial<{
    companyHealthScore: number;
    workforceGrowthPercent: number;
    employeeRetentionRate: number;
    attritionRate: number;
    hiringSuccessRate: number;
    attendanceCompliancePercent: number;
    performanceIndex: number;
    payrollGrowthPercent: number;
    goalAchievementPercent: number;
    employeeSatisfaction: number | null;
  }>;
};

export type CeoAnalyticsWorkforce = {
  headcountGrowth: CeoAnalyticsChartItem[];
  departmentGrowth: CeoAnalyticsChartItem[];
  managerDistribution: CeoAnalyticsChartItem[];
  employmentTypeDistribution: CeoAnalyticsChartItem[];
  averageTenureYears: number;
  genderDistribution: CeoAnalyticsChartItem[];
  ageDistribution: CeoAnalyticsChartItem[];
  joiningTrend: CeoAnalyticsChartItem[];
  exitTrend: CeoAnalyticsChartItem[];
};

export type CeoAnalyticsHiring = {
  hiringTrend: CeoAnalyticsChartItem[];
  recruitmentFunnel: CeoAnalyticsChartItem[];
  offerAcceptanceRate: number;
  timeToHireDays: number;
  openPositions: number;
  filledPositions: number;
  recruitmentByDepartment: CeoAnalyticsChartItem[];
  recruiterPerformance: CeoAnalyticsChartItem[];
};

export type CeoAnalyticsPerformance = {
  averageRating: number;
  departmentComparison: CeoAnalyticsChartItem[];
  managerComparison: CeoAnalyticsChartItem[];
  goalCompletion: CeoAnalyticsChartItem[];
  promotionPipeline: CeoAnalyticsChartItem[];
  employeesOnPip: number;
  topDepartments: CeoAnalyticsChartItem[];
  lowPerformingDepartments: CeoAnalyticsChartItem[];
};

export type CeoAnalyticsAttendance = {
  attendancePercent: number;
  latePercent: number;
  wfhPercent: number;
  leavePercent: number;
  averageWorkingHours: number;
  departmentAttendance: CeoAnalyticsChartItem[];
  attendanceHeatmap: CeoAnalyticsChartItem[];
  monthlyAttendanceTrend: CeoAnalyticsChartItem[];
};

export type CeoAnalyticsPayroll = {
  payrollCostTrend: CeoAnalyticsChartItem[];
  departmentPayroll: CeoAnalyticsChartItem[];
  averageSalary: number;
  salaryDistribution: CeoAnalyticsChartItem[];
  benefitsCost: number;
  bonusTrend: CeoAnalyticsChartItem[];
  payrollGrowth: CeoAnalyticsChartItem[];
};

export type CeoAnalyticsInsightPriority = "high" | "medium" | "low";

export type CeoAnalyticsInsight = {
  id: string;
  title: string;
  description: string;
  priority: CeoAnalyticsInsightPriority;
};

export type CeoAnalyticsComparison = {
  mode: CeoAnalyticsCompareMode;
  currentLabel: string;
  previousLabel: string;
  metrics: {
    label: string;
    current: number;
    previous: number;
    deltaPercent: number;
  }[];
  departmentComparison?: {
    leftLabel: string;
    rightLabel: string;
    series: {
      label: string;
      left: number;
      right: number;
    }[];
  } | null;
};

export type CeoAnalyticsFilterLookups = {
  departments: LookupOption[];
  branches: LookupOption[];
  managers: LookupOption[];
  employmentTypes: LookupOption[];
};

export type CeoAnalyticsExportFormat = "csv" | "excel" | "pdf" | "summary_pdf";

export type CeoAnalyticsPageData = {
  kpis: CeoAnalyticsKpis;
  workforce: CeoAnalyticsWorkforce;
  hiring: CeoAnalyticsHiring;
  performance: CeoAnalyticsPerformance;
  attendance: CeoAnalyticsAttendance;
  payroll: CeoAnalyticsPayroll;
  insights: CeoAnalyticsInsight[];
  comparison: CeoAnalyticsComparison;
  lookups: CeoAnalyticsFilterLookups;
  generatedAt: string;
};
