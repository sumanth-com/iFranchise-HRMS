import type { LookupOption } from "@/types/employee";
import type { ReportExportFormat, ReportScheduleFrequency } from "@/types/reports";

export type CeoReportCategory =
  | "attendance"
  | "leave"
  | "payroll"
  | "recruitment"
  | "performance"
  | "department"
  | "headcount"
  | "attrition"
  | "training"
  | "organization"
  | "executive_summary"
  | "board"
  | "compliance";

export type CeoReportFormat =
  | ReportExportFormat
  | "summary_pdf"
  | "board_summary";

export type CeoReportsListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: CeoReportCategory;
  departmentId?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  format?: CeoReportFormat;
  createdById?: string;
};

export type CeoReportsKpis = {
  totalReportsGenerated: number;
  scheduledReports: number;
  reportsGeneratedThisMonth: number;
  mostDownloadedReport: string | null;
  lastGeneratedReport: string | null;
  nextScheduledReport: string | null;
  failedReportJobs: number;
  reportStorageUsageBytes: number;
};

export type CeoReportLibraryRow = {
  id: string;
  reportName: string;
  reportKey: string;
  category: CeoReportCategory;
  categoryLabel: string;
  departmentName: string | null;
  generatedByName: string | null;
  createdAt: string;
  format: CeoReportFormat;
  status: string;
  byteSize: number;
  downloadCount: number;
  lastDownloadedAt: string | null;
};

export type CeoReportLibraryResult = {
  data: CeoReportLibraryRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type CeoReportPreview = {
  id: string;
  reportName: string;
  reportKey: string;
  categoryLabel: string;
  periodFrom: string | null;
  periodTo: string | null;
  generatedAt: string;
  generatedByName: string | null;
  dataSources: string[];
  keyInsights: string[];
  previewRows: Record<string, string | number | null>[];
  rowCount: number;
  format: CeoReportFormat;
  status: string;
  downloadCount: number;
  byteSize: number;
};

export type CeoReportCatalogItem = {
  key: string;
  category: CeoReportCategory;
  categoryLabel: string;
  title: string;
  description: string;
  dataSources: string[];
  defaultColumns: string[];
};

export type CeoReportScheduleRow = {
  id: string;
  name: string;
  reportKey: string;
  reportTitle: string;
  frequency: ReportScheduleFrequency;
  exportFormat: ReportExportFormat;
  recipients: string[];
  isEnabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
};

export type CeoReportHistoryRow = {
  id: string;
  reportName: string;
  generatedAt: string;
  generatedByName: string | null;
  status: string;
  downloadCount: number;
  lastDownloadedAt: string | null;
  format: CeoReportFormat;
};

export type CeoReportsInsights = {
  mostRequested: { label: string; value: number }[];
  frequentlyDownloaded: { label: string; value: number }[];
  departmentUsage: { label: string; value: number }[];
  generationTrend: { label: string; value: number }[];
};

export type CeoReportsFilterLookups = {
  departments: LookupOption[];
  branches: LookupOption[];
  creators: LookupOption[];
};

export type CeoReportsPageData = {
  kpis: CeoReportsKpis;
  catalog: CeoReportCatalogItem[];
  library: CeoReportLibraryResult;
  schedules: CeoReportScheduleRow[];
  history: CeoReportHistoryRow[];
  insights: CeoReportsInsights;
  lookups: CeoReportsFilterLookups;
};

export type CeoReportsActionResult =
  | {
      success: true;
      message: string;
      runId?: string;
      filename?: string;
      mimeType?: string;
      contentBase64?: string;
    }
  | { success: false; message: string };
