import { format, parseISO, startOfMonth, subMonths } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  CEO_REPORT_CATEGORY_LABELS,
  CEO_REPORT_DEFINITIONS,
  getCeoReportDefinition,
} from "@/lib/ceo/ceo-report-definitions";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { getCeoAnalyticsPageData } from "@/lib/ceo/services/ceo-analytics-queries";
import {
  createNotification,
  notifyEmployee,
} from "@/lib/notifications/services/notification-service";
import { REPORT_KEY_LABELS } from "@/lib/reports/constants";
import { runReport } from "@/lib/reports/services/reports-queries";
import {
  deleteReportSchedule,
  listReportSchedules,
} from "@/lib/reports/services/reports-schedules";
import {
  formatEmployeeName,
  fromHrms,
  reportToCsv,
  reportToExcelXml,
  reportToPdfBytes,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import { ceoReportsListParamsSchema } from "@/lib/validations/ceo-reports";
import type { UserProfile } from "@/types/auth";
import type {
  CeoReportCatalogItem,
  CeoReportFormat,
  CeoReportHistoryRow,
  CeoReportLibraryResult,
  CeoReportPreview,
  CeoReportScheduleRow,
  CeoReportsFilterLookups,
  CeoReportsInsights,
  CeoReportsKpis,
  CeoReportsListParams,
  CeoReportsPageData,
  CeoReportCategory,
} from "@/types/ceo-reports";
import type { ReportKey, ReportResult, ReportScheduleFrequency } from "@/types/reports";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return unwrapRelation(value as T | T[] | null);
}

function parseParams(params: CeoReportsListParams) {
  return ceoReportsListParamsSchema.parse(params);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { formatBytes };

function estimateByteSize(content: string | Uint8Array) {
  if (typeof content === "string") return Buffer.byteLength(content, "utf8");
  return content.byteLength;
}

async function buildCustomReportResult(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  reportKey: string,
  filters: {
    dateFrom?: string;
    dateTo?: string;
    departmentId?: string;
  },
): Promise<ReportResult> {
  const analytics = await getCeoAnalyticsPageData(supabase, profile, {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    departmentId: filters.departmentId,
    compareMode: "none",
  });

  const def = getCeoReportDefinition(reportKey);
  const rows: ReportResult["rows"] = [];

  const push = (section: string, metric: string, value: string | number) => {
    rows.push({ section, metric, value });
  };

  if (reportKey === "ceo_executive_summary" || reportKey === "ceo_board_report") {
    push("KPI", "Company Health Score", analytics.kpis.companyHealthScore);
    push("KPI", "Workforce Growth %", analytics.kpis.workforceGrowthPercent);
    push("KPI", "Retention Rate %", analytics.kpis.employeeRetentionRate);
    push("KPI", "Attrition Rate %", analytics.kpis.attritionRate);
    push("KPI", "Hiring Success %", analytics.kpis.hiringSuccessRate);
    push("KPI", "Attendance Compliance %", analytics.kpis.attendanceCompliancePercent);
    push("KPI", "Performance Index", analytics.kpis.performanceIndex);
    push("KPI", "Payroll Growth %", analytics.kpis.payrollGrowthPercent);
    for (const insight of analytics.insights) {
      push("Insight", insight.title, insight.description);
    }
  }

  if (reportKey === "ceo_compliance_report") {
    push("Compliance", "Attendance %", analytics.attendance.attendancePercent);
    push("Compliance", "Late %", analytics.attendance.latePercent);
    push("Compliance", "Leave %", analytics.attendance.leavePercent);
    push("Compliance", "Employees on PIP", analytics.performance.employeesOnPip);
    for (const item of analytics.attendance.departmentAttendance.slice(0, 10)) {
      push("Department Attendance %", item.label, item.value);
    }
  }

  if (reportKey === "ceo_organization_report") {
    for (const item of analytics.workforce.departmentGrowth) {
      push("Department Headcount", item.label, item.value);
    }
    for (const item of analytics.workforce.employmentTypeDistribution) {
      push("Employment Type", item.label, item.value);
    }
    for (const item of analytics.workforce.managerDistribution) {
      push("Manager Span", item.label, item.value);
    }
  }

  if (reportKey === "ceo_headcount_report") {
    for (const item of analytics.workforce.headcountGrowth) {
      push("Headcount Trend", item.label, item.value);
    }
    for (const item of analytics.workforce.joiningTrend) {
      push("Joiners", item.label, item.value);
    }
    for (const item of analytics.workforce.exitTrend) {
      push("Exits", item.label, item.value);
    }
  }

  if (reportKey === "ceo_training_report") {
    push("Training", "Goal Achievement %", analytics.kpis.goalAchievementPercent);
    push("Training", "Performance Index", analytics.kpis.performanceIndex);
    for (const item of analytics.performance.goalCompletion) {
      push("Goal Completion by Department", item.label, item.value);
    }
  }

  return {
    key: "hr_department",
    title: def?.title ?? "Executive Report",
    generatedAt: new Date().toISOString(),
    columns: [
      { key: "section", header: "Section" },
      { key: "metric", header: "Metric" },
      { key: "value", header: "Value" },
    ],
    rows,
    total: rows.length,
  };
}

export async function resolveCeoReportResult(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  reportKey: string,
  filters: {
    dateFrom?: string;
    dateTo?: string;
    departmentId?: string;
    branchId?: string;
  },
): Promise<ReportResult> {
  const def = getCeoReportDefinition(reportKey);
  if (!def) throw new Error("Unknown report type.");

  if (!def.reportKey) {
    return buildCustomReportResult(supabase, profile, reportKey, filters);
  }

  return runReport(supabase, profile, def.reportKey as ReportKey, {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    departmentId: filters.departmentId,
  });
}

export async function encodeCeoReportExport(
  result: ReportResult,
  format: CeoReportFormat,
): Promise<{ filename: string; mimeType: string; contentBase64: string; byteSize: number }> {
  const slug = result.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

  if (format === "csv") {
    const content = reportToCsv(result);
    return {
      filename: `${slug}.csv`,
      mimeType: "text/csv;charset=utf-8",
      contentBase64: Buffer.from(content, "utf8").toString("base64"),
      byteSize: estimateByteSize(content),
    };
  }

  if (format === "excel") {
    const content = reportToExcelXml(result);
    return {
      filename: `${slug}.xls`,
      mimeType: "application/vnd.ms-excel",
      contentBase64: Buffer.from(content, "utf8").toString("base64"),
      byteSize: estimateByteSize(content),
    };
  }

  if (format === "summary_pdf" || format === "board_summary") {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595, 842]);
    let y = 794;
    const write = (text: string, size = 11, useBold = false) => {
      if (y < 48) {
        page = pdf.addPage([595, 842]);
        y = 794;
      }
      page.drawText(text.slice(0, 95), {
        x: 48,
        y,
        size,
        font: useBold ? bold : font,
        color: rgb(0.12, 0.12, 0.14),
      });
      y -= size + 8;
    };
    write(result.title, 16, true);
    write(`Generated ${result.generatedAt}`, 10);
    y -= 4;
    for (const row of result.rows.slice(0, 60)) {
      write(`${row.section ?? ""} · ${row.metric ?? ""}: ${row.value ?? ""}`, 10);
    }
    const bytes = await pdf.save();
    return {
      filename: `${slug}-${format === "board_summary" ? "board" : "summary"}.pdf`,
      mimeType: "application/pdf",
      contentBase64: Buffer.from(bytes).toString("base64"),
      byteSize: estimateByteSize(bytes),
    };
  }

  const bytes = await reportToPdfBytes(result);
  return {
    filename: `${slug}.pdf`,
    mimeType: "application/pdf",
    contentBase64: Buffer.from(bytes).toString("base64"),
    byteSize: estimateByteSize(bytes),
  };
}

function buildInsightsFromResult(result: ReportResult): string[] {
  const insights: string[] = [];
  insights.push(`${result.total} rows included in this report.`);
  const first = result.rows[0];
  if (first) {
    const metric = first.metric ?? first[result.columns[0]?.key ?? ""] ?? "metrics";
    insights.push(`Leading row highlights ${String(metric)}.`);
  }
  if (result.total > 100) {
    insights.push("Large dataset — prefer Excel/CSV for full tabular review.");
  }
  return insights.slice(0, 5);
}

export async function recordExecutiveReportRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    reportKey: string;
    format: CeoReportFormat;
    result: ReportResult;
    byteSize: number;
    filters: Record<string, unknown>;
    source: "on_demand" | "schedule" | "builder" | "share";
    scheduleId?: string | null;
    departmentId?: string | null;
    branchId?: string | null;
    columns?: string[];
    status?: "completed" | "failed";
    errorMessage?: string | null;
  },
): Promise<string> {
  const def = getCeoReportDefinition(input.reportKey);
  const filters = input.filters as {
    dateFrom?: string;
    dateTo?: string;
  };

  const previewRows = input.result.rows.slice(0, 12).map((row) => {
    const next: Record<string, string | number | null> = {};
    for (const col of input.result.columns.slice(0, 6)) {
      const value = row[col.key];
      next[col.header] =
        value == null ? null : typeof value === "number" ? value : String(value);
    }
    return next;
  });

  const { data, error } = await fromHrms(supabase, "executive_report_runs")
    .insert({
      organization_id: profile.employee.organizationId,
      report_key: input.reportKey,
      report_name: def?.title ?? input.result.title,
      category: def?.category ?? "organization",
      department_id: input.departmentId ?? null,
      branch_id: input.branchId ?? null,
      export_format: input.format,
      run_status: input.status ?? "completed",
      source: input.source,
      schedule_id: input.scheduleId ?? null,
      filters: input.filters,
      columns_selected: input.columns ?? input.result.columns.map((c) => c.key),
      key_insights: buildInsightsFromResult(input.result),
      data_sources: def?.dataSources ?? [],
      preview_rows: previewRows,
      row_count: input.result.total,
      byte_size: input.byteSize,
      message:
        input.status === "failed"
          ? input.errorMessage
          : `Generated ${input.result.total} rows`,
      error_message: input.errorMessage ?? null,
      period_from: filters.dateFrom ?? null,
      period_to: filters.dateTo ?? null,
      generated_by_employee_id: profile.employee.id,
      generated_by_user_id: profile.userId,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to record report run");
  return data.id as string;
}

export async function notifyReportReady(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: { reportName: string; format: string; runId: string },
) {
  await createNotification(supabase, {
    organizationId: profile.employee.organizationId,
    userId: profile.userId,
    employeeId: profile.employee.id,
    title: `Report ready: ${input.reportName}`,
    message: `${input.reportName} (${input.format}) is ready to download.`,
    notificationType: "executive_report_ready",
    module: "reports",
    priority: "medium",
    actionUrl: CEO_ROUTES.reports,
    sourceEventKey: `executive_report_ready:${input.runId}`,
    templateKey: "executive_report_ready",
    templateVariables: {
      reportName: input.reportName,
      format: input.format,
    },
    createdBy: profile.userId,
  });
}

export async function getCeoReportsFilterLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<CeoReportsFilterLookups> {
  const [departments, branches, creators] = await Promise.all([
    fromHrms(supabase, "departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "branches")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "executive_report_runs")
      .select(
        "generated_by_employee_id, generator:generated_by_employee_id(id, first_name, last_name)",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .not("generated_by_employee_id", "is", null),
  ]);

  if (departments.error) throw new Error(departments.error.message);
  if (branches.error) throw new Error(branches.error.message);
  if (creators.error) throw new Error(creators.error.message);

  const creatorMap = new Map<string, string>();
  for (const row of (creators.data ?? []) as LooseRow[]) {
    const person = unwrap(row.generator);
    if (!person?.id) continue;
    creatorMap.set(person.id, formatEmployeeName(person.first_name, person.last_name));
  }

  return {
    departments: ((departments.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    branches: ((branches.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    creators: [...creatorMap.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export async function getCeoReportsKpis(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoReportsKpis> {
  const organizationId = profile.employee.organizationId;
  const monthStart = startOfMonth(new Date()).toISOString();

  const [runsRes, schedulesRes] = await Promise.all([
    fromHrms(supabase, "executive_report_runs")
      .select(
        "id, report_name, download_count, byte_size, run_status, generated_at",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("generated_at", { ascending: false })
      .limit(2000),
    listReportSchedules(supabase, profile),
  ]);

  if (runsRes.error) throw new Error(runsRes.error.message);
  const runs = (runsRes.data ?? []) as LooseRow[];

  const mostDownloaded = [...runs].sort(
    (a, b) => Number(b.download_count ?? 0) - Number(a.download_count ?? 0),
  )[0];
  const nextSchedule = [...schedulesRes]
    .filter((item) => item.isEnabled && item.nextRunAt)
    .sort((a, b) => String(a.nextRunAt).localeCompare(String(b.nextRunAt)))[0];

  return {
    totalReportsGenerated: runs.length,
    scheduledReports: schedulesRes.filter((item) => item.isEnabled).length,
    reportsGeneratedThisMonth: runs.filter((row) => row.generated_at >= monthStart).length,
    mostDownloadedReport: mostDownloaded?.report_name ?? null,
    lastGeneratedReport: runs[0]?.report_name ?? null,
    nextScheduledReport: nextSchedule
      ? `${nextSchedule.name} · ${format(parseISO(nextSchedule.nextRunAt!), "dd MMM yyyy")}`
      : null,
    failedReportJobs:
      runs.filter((row) => row.run_status === "failed").length +
      schedulesRes.filter((item) => item.lastRunStatus === "failed").length,
    reportStorageUsageBytes: runs.reduce(
      (sum, row) => sum + Number(row.byte_size ?? 0),
      0,
    ),
  };
}

export async function listCeoReportLibrary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoReportsListParams,
): Promise<CeoReportLibraryResult> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(params);
  const page = parsed.page ?? 1;
  const pageSize = parsed.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = fromHrms(supabase, "executive_report_runs")
    .select(
      `id, report_name, report_key, category, export_format, run_status, byte_size,
       download_count, last_downloaded_at, generated_at, department_id,
       department:department_id(name),
       generator:generated_by_employee_id(first_name, last_name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("generated_at", { ascending: false })
    .range(from, to);

  if (parsed.category) query = query.eq("category", parsed.category);
  if (parsed.departmentId) query = query.eq("department_id", parsed.departmentId);
  if (parsed.branchId) query = query.eq("branch_id", parsed.branchId);
  if (parsed.format) query = query.eq("export_format", parsed.format);
  if (parsed.createdById) {
    query = query.eq("generated_by_employee_id", parsed.createdById);
  }
  if (parsed.dateFrom) query = query.gte("generated_at", parsed.dateFrom);
  if (parsed.dateTo) {
    const end = parsed.dateTo.includes("T")
      ? parsed.dateTo
      : `${parsed.dateTo}T23:59:59.999Z`;
    query = query.lte("generated_at", end);
  }
  if (parsed.search?.trim()) {
    const term = parsed.search.trim();
    query = query.or(
      `report_name.ilike.%${term}%,report_key.ilike.%${term}%,category.ilike.%${term}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as LooseRow[]).map((row) => {
    const category = row.category as CeoReportCategory;
    const generator = unwrap(row.generator);
    const department = unwrap(row.department);
    return {
      id: row.id as string,
      reportName: row.report_name as string,
      reportKey: row.report_key as string,
      category,
      categoryLabel: CEO_REPORT_CATEGORY_LABELS[category] ?? category,
      departmentName: (department?.name as string | null) ?? null,
      generatedByName: generator
        ? formatEmployeeName(generator.first_name, generator.last_name)
        : null,
      createdAt: row.generated_at as string,
      format: row.export_format as CeoReportFormat,
      status: row.run_status as string,
      byteSize: Number(row.byte_size ?? 0),
      downloadCount: Number(row.download_count ?? 0),
      lastDownloadedAt: (row.last_downloaded_at as string | null) ?? null,
    };
  });

  return { data: rows, total: count ?? rows.length, page, pageSize };
}

export async function getCeoReportPreview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  runId: string,
): Promise<CeoReportPreview> {
  const { data, error } = await fromHrms(supabase, "executive_report_runs")
    .select(
      `*, generator:generated_by_employee_id(first_name, last_name)`,
    )
    .eq("id", runId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Report not found.");

  const row = data as LooseRow;
  const generator = unwrap(row.generator);
  const category = row.category as CeoReportCategory;

  return {
    id: row.id,
    reportName: row.report_name,
    reportKey: row.report_key,
    categoryLabel: CEO_REPORT_CATEGORY_LABELS[category] ?? category,
    periodFrom: row.period_from,
    periodTo: row.period_to,
    generatedAt: row.generated_at,
    generatedByName: generator
      ? formatEmployeeName(generator.first_name, generator.last_name)
      : null,
    dataSources: (row.data_sources as string[]) ?? [],
    keyInsights: (row.key_insights as string[]) ?? [],
    previewRows: (row.preview_rows as Record<string, string | number | null>[]) ?? [],
    rowCount: Number(row.row_count ?? 0),
    format: row.export_format,
    status: row.run_status,
    downloadCount: Number(row.download_count ?? 0),
    byteSize: Number(row.byte_size ?? 0),
  };
}

export async function listCeoReportSchedulesMapped(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoReportScheduleRow[]> {
  const schedules = await listReportSchedules(supabase, profile);
  return schedules.map((item) => ({
    id: item.id,
    name: item.name,
    reportKey: item.reportKey,
    reportTitle:
      getCeoReportDefinition(item.reportKey)?.title ??
      REPORT_KEY_LABELS[item.reportKey] ??
      item.reportKey,
    frequency: item.frequency as ReportScheduleFrequency,
    exportFormat: item.exportFormat,
    recipients: item.recipients,
    isEnabled: item.isEnabled,
    nextRunAt: item.nextRunAt,
    lastRunAt: item.lastRunAt,
    lastRunStatus: item.lastRunStatus,
  }));
}

export async function getCeoReportsHistory(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoReportHistoryRow[]> {
  const { data, error } = await fromHrms(supabase, "executive_report_runs")
    .select(
      `id, report_name, generated_at, run_status, download_count, last_downloaded_at,
       export_format, generator:generated_by_employee_id(first_name, last_name)`,
    )
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .order("generated_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return ((data ?? []) as LooseRow[]).map((row) => {
    const generator = unwrap(row.generator);
    return {
      id: row.id,
      reportName: row.report_name,
      generatedAt: row.generated_at,
      generatedByName: generator
        ? formatEmployeeName(generator.first_name, generator.last_name)
        : null,
      status: row.run_status,
      downloadCount: Number(row.download_count ?? 0),
      lastDownloadedAt: row.last_downloaded_at,
      format: row.export_format,
    };
  });
}

export async function getCeoReportsInsights(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoReportsInsights> {
  const { data, error } = await fromHrms(supabase, "executive_report_runs")
    .select(
      "report_name, category, download_count, generated_at, department:department_id(name)",
    )
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .order("generated_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as LooseRow[];

  const requested = new Map<string, number>();
  const downloaded = new Map<string, number>();
  const byDept = new Map<string, number>();
  const months = Array.from({ length: 6 }, (_, index) =>
    subMonths(new Date(), 5 - index),
  );
  const trend = new Map(months.map((date) => [format(date, "yyyy-MM"), 0]));

  for (const row of rows) {
    requested.set(row.report_name, (requested.get(row.report_name) ?? 0) + 1);
    downloaded.set(
      row.report_name,
      (downloaded.get(row.report_name) ?? 0) + Number(row.download_count ?? 0),
    );
    const dept = unwrap(row.department)?.name ?? "Unassigned";
    byDept.set(dept, (byDept.get(dept) ?? 0) + 1);
    const key = String(row.generated_at).slice(0, 7);
    if (trend.has(key)) trend.set(key, (trend.get(key) ?? 0) + 1);
  }

  const toChart = (map: Map<string, number>, limit = 6) =>
    [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

  return {
    mostRequested: toChart(requested),
    frequentlyDownloaded: toChart(downloaded),
    departmentUsage: toChart(byDept),
    generationTrend: months.map((date) => ({
      label: format(date, "MMM yyyy"),
      value: trend.get(format(date, "yyyy-MM")) ?? 0,
    })),
  };
}

export function getCeoReportCatalog(): CeoReportCatalogItem[] {
  return CEO_REPORT_DEFINITIONS.map((item) => ({
    key: item.key,
    category: item.category,
    categoryLabel: CEO_REPORT_CATEGORY_LABELS[item.category],
    title: item.title,
    description: item.description,
    dataSources: item.dataSources,
    defaultColumns: item.defaultColumns,
  }));
}

export async function getCeoReportsPageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoReportsListParams,
): Promise<CeoReportsPageData> {
  const [kpis, library, schedules, history, insights, lookups] = await Promise.all([
    getCeoReportsKpis(supabase, profile),
    listCeoReportLibrary(supabase, profile, params),
    listCeoReportSchedulesMapped(supabase, profile),
    getCeoReportsHistory(supabase, profile),
    getCeoReportsInsights(supabase, profile),
    getCeoReportsFilterLookups(supabase, profile.employee.organizationId),
  ]);

  return {
    kpis,
    catalog: getCeoReportCatalog(),
    library,
    schedules,
    history,
    insights,
    lookups,
  };
}

export async function generateCeoReport(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    reportKey: string;
    format: CeoReportFormat;
    departmentId?: string;
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
    columns?: string[];
    source?: "on_demand" | "builder";
  },
) {
  const filters = {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    departmentId: input.departmentId,
    branchId: input.branchId,
  };

  try {
    const result = await resolveCeoReportResult(
      supabase,
      profile,
      input.reportKey,
      filters,
    );

    let exportResult = await encodeCeoReportExport(result, input.format);
    if (input.columns?.length) {
      const filtered = {
        ...result,
        columns: result.columns.filter((col) => input.columns!.includes(col.key)),
        rows: result.rows.map((row) => {
          const next: ReportResult["rows"][number] = {};
          for (const key of input.columns!) {
            if (key in row) next[key] = row[key];
          }
          return next;
        }),
      };
      exportResult = await encodeCeoReportExport(filtered, input.format);
    }

    const runId = await recordExecutiveReportRun(supabase, profile, {
      reportKey: input.reportKey,
      format: input.format,
      result,
      byteSize: exportResult.byteSize,
      filters,
      source: input.source ?? "on_demand",
      departmentId: input.departmentId,
      branchId: input.branchId,
      columns: input.columns,
    });

    await notifyReportReady(supabase, profile, {
      reportName: result.title,
      format: input.format,
      runId,
    });

    return {
      runId,
      ...exportResult,
      message: "Report generated successfully.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report generation failed.";
    await recordExecutiveReportRun(supabase, profile, {
      reportKey: input.reportKey,
      format: input.format,
      result: {
        key: "hr_department",
        title: getCeoReportDefinition(input.reportKey)?.title ?? "Report",
        generatedAt: new Date().toISOString(),
        columns: [],
        rows: [],
        total: 0,
      },
      byteSize: 0,
      filters,
      source: input.source ?? "on_demand",
      departmentId: input.departmentId,
      branchId: input.branchId,
      status: "failed",
      errorMessage: message,
    }).catch(() => null);
    throw new Error(message);
  }
}

export async function downloadCeoReportRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  runId: string,
  formatOverride?: CeoReportFormat,
) {
  const { data, error } = await fromHrms(supabase, "executive_report_runs")
    .select("*")
    .eq("id", runId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Report not found.");

  const row = data as LooseRow;
  const format = (formatOverride ?? row.export_format) as CeoReportFormat;
  const result = await resolveCeoReportResult(supabase, profile, row.report_key, {
    dateFrom: row.period_from ?? undefined,
    dateTo: row.period_to ?? undefined,
    departmentId: row.department_id ?? undefined,
    branchId: row.branch_id ?? undefined,
  });

  const exported = await encodeCeoReportExport(result, format);

  await fromHrms(supabase, "executive_report_runs")
    .update({
      download_count: Number(row.download_count ?? 0) + 1,
      last_downloaded_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", runId);

  return exported;
}

export async function shareCeoReportRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: { runId: string; recipientEmails: string[]; message?: string },
) {
  const preview = await getCeoReportPreview(supabase, profile, input.runId);

  const { data: users, error } = await fromHrms(supabase, "employees")
    .select("id, email, first_name, last_name")
    .eq("organization_id", profile.employee.organizationId)
    .in("email", input.recipientEmails)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const sharedBy = formatEmployeeName(
    profile.employee.firstName,
    profile.employee.lastName,
  );

  for (const employee of (users ?? []) as LooseRow[]) {
    await notifyEmployee(supabase, {
      organizationId: profile.employee.organizationId,
      employeeId: employee.id,
      title: `Shared report: ${preview.reportName}`,
      message:
        input.message ??
        `${sharedBy} shared ${preview.reportName} with you.`,
      notificationType: "executive_report_shared",
      module: "reports",
      priority: "medium",
      actionUrl: CEO_ROUTES.reports,
      sourceEventKey: `executive_report_shared:${input.runId}:${employee.id}`,
      templateKey: "executive_report_shared",
      templateVariables: {
        reportName: preview.reportName,
        sharedBy,
      },
      createdBy: profile.userId,
    });
  }

  await fromHrms(supabase, "executive_report_runs")
    .update({
      shared_with: input.recipientEmails,
      updated_by: profile.userId,
    })
    .eq("id", input.runId);

  return {
    notified: (users ?? []).length,
    message: `Shared with ${(users ?? []).length} recipient(s).`,
  };
}

export async function saveCeoReportSchedule(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    scheduleId?: string;
    name: string;
    reportKey: string;
    frequency: ReportScheduleFrequency;
    exportFormat: "csv" | "excel" | "pdf";
    recipients: string[];
    isEnabled: boolean;
    departmentId?: string;
    dateFrom?: string;
    dateTo?: string;
  },
) {
  const organizationId = profile.employee.organizationId;
  const filters = {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    departmentId: input.departmentId,
  };
  const { computeNextRunAt } = await import("@/lib/reports/services/reports-utils");

  if (input.scheduleId) {
    const { error } = await fromHrms(supabase, "report_schedules")
      .update({
        name: input.name,
        report_key: input.reportKey,
        frequency: input.frequency,
        export_format: input.exportFormat,
        recipients: input.recipients,
        filters,
        is_enabled: input.isEnabled,
        next_run_at: input.isEnabled
          ? computeNextRunAt(input.frequency)
          : null,
        updated_by: profile.userId,
      })
      .eq("id", input.scheduleId)
      .eq("organization_id", organizationId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);
    return input.scheduleId;
  }

  const { data, error } = await fromHrms(supabase, "report_schedules")
    .insert({
      organization_id: organizationId,
      name: input.name,
      report_key: input.reportKey,
      frequency: input.frequency,
      export_format: input.exportFormat,
      recipients: input.recipients,
      filters,
      is_enabled: input.isEnabled,
      next_run_at: input.isEnabled ? computeNextRunAt(input.frequency) : null,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create schedule");
  return data.id as string;
}

export async function toggleCeoReportSchedule(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  scheduleId: string,
  isEnabled: boolean,
) {
  const schedules = await listReportSchedules(supabase, profile);
  const existing = schedules.find((item) => item.id === scheduleId);
  if (!existing) throw new Error("Schedule not found.");

  const { computeNextRunAt } = await import("@/lib/reports/services/reports-utils");
  const { error } = await fromHrms(supabase, "report_schedules")
    .update({
      is_enabled: isEnabled,
      next_run_at: isEnabled
        ? computeNextRunAt(existing.frequency as ReportScheduleFrequency)
        : null,
      updated_by: profile.userId,
    })
    .eq("id", scheduleId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function removeCeoReportSchedule(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  scheduleId: string,
) {
  await deleteReportSchedule(supabase, profile, scheduleId);
}
