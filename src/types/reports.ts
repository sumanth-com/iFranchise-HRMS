export type ReportExportFormat = "csv" | "excel" | "pdf";
export type ReportScheduleFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type ReportModuleKey =
  | "hr"
  | "attendance"
  | "leave"
  | "payroll"
  | "performance"
  | "recruitment"
  | "assets"
  | "exit";

export type ReportKey =
  | "hr_employee_master"
  | "hr_department"
  | "hr_designation"
  | "hr_joining"
  | "hr_probation"
  | "attendance_daily"
  | "attendance_weekly"
  | "attendance_monthly"
  | "attendance_late"
  | "attendance_overtime"
  | "attendance_absent"
  | "attendance_holiday"
  | "leave_balance"
  | "leave_utilization"
  | "leave_trends"
  | "leave_rejected"
  | "leave_pending"
  | "payroll_salary"
  | "payroll_register"
  | "payroll_deductions"
  | "payroll_bonuses"
  | "payroll_reimbursements"
  | "payroll_net"
  | "performance_kpi"
  | "performance_goals"
  | "performance_reviews"
  | "performance_promotions"
  | "recruitment_jobs"
  | "recruitment_pipeline"
  | "recruitment_funnel"
  | "recruitment_offers"
  | "recruitment_time_to_hire"
  | "assets_assigned"
  | "assets_returned"
  | "assets_maintenance"
  | "assets_warranty"
  | "exit_resignations"
  | "exit_attrition"
  | "exit_reasons"
  | "exit_settlement";

export type ReportsSettings = {
  defaultExportFormat: ReportExportFormat;
  defaultDateRangeDays: number;
  enabledModules: ReportModuleKey[];
  scheduleEmailEnabled: boolean;
  scheduleRetainRuns: number;
};

export type ReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  designationId?: string;
  employeeId?: string;
  status?: string;
  month?: number;
  year?: number;
  reportKey?: ReportKey;
  /** When set, restricts employee-scoped reports to this team (manager portal). */
  teamEmployeeIds?: string[];
  /** When set, restricts recruitment reports to managed departments. */
  recruitmentDepartmentIds?: string[];
};

export type ReportColumn = { key: string; header: string };
export type ReportRow = Record<string, string | number | null | undefined>;

export type ReportResult = {
  key: ReportKey;
  title: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  total: number;
};

export type ChartSeriesItem = {
  label: string;
  value: number;
};

export type ExecutiveDashboard = {
  cards: {
    totalEmployees: number;
    newHires: number;
    employeesLeft: number;
    attendanceToday: number;
    employeesOnLeave: number;
    payrollCost: number;
    averagePerformanceRating: number;
    openRecruitments: number;
    assetsAssigned: number;
    pendingExitClearance: number;
  };
  charts: {
    employeeGrowth: ChartSeriesItem[];
    hiringTrend: ChartSeriesItem[];
    attritionTrend: ChartSeriesItem[];
    attendanceTrend: ChartSeriesItem[];
    leaveTrend: ChartSeriesItem[];
    payrollCostTrend: ChartSeriesItem[];
    departmentDistribution: ChartSeriesItem[];
    performanceDistribution: ChartSeriesItem[];
    recruitmentFunnel: ChartSeriesItem[];
    assetAllocation: ChartSeriesItem[];
  };
};

export type ReportsLookups = {
  departments: { id: string; label: string }[];
  designations: { id: string; label: string }[];
  employees: { id: string; label: string }[];
};

export type ReportScheduleItem = {
  id: string;
  name: string;
  reportKey: ReportKey;
  frequency: ReportScheduleFrequency;
  exportFormat: ReportExportFormat;
  recipients: string[];
  filters: ReportFilters;
  isEnabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunMessage: string | null;
  createdAt: string;
};

export type ReportScheduleRunItem = {
  id: string;
  scheduleId: string;
  reportKey: string;
  exportFormat: string;
  runStatus: string;
  rowCount: number;
  message: string | null;
  createdAt: string;
};
