import { z } from "zod";

import { REPORT_DEFINITIONS } from "@/lib/reports/constants";

const reportKeys = REPORT_DEFINITIONS.map((d) => d.key) as [
  (typeof REPORT_DEFINITIONS)[number]["key"],
  ...(typeof REPORT_DEFINITIONS)[number]["key"][],
];

export const generatedReportSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  generatedAt: z.string().min(1),
  total: z.number().int().min(0),
  columns: z.array(z.object({ key: z.string().min(1), header: z.string().min(1) })).min(1),
  rows: z
    .array(
      z.record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
      ),
    )
    .max(5000),
});

export const reportFiltersSchema = z.object({
  dateFrom: z.string().optional().or(z.literal("")),
  dateTo: z.string().optional().or(z.literal("")),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  designationId: z.string().uuid().optional().or(z.literal("")),
  employeeId: z.string().uuid().optional().or(z.literal("")),
  leaveTypeId: z.string().uuid().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
  assetAction: z
    .enum(["all", "report", "replace", "return", "assigned"])
    .optional()
    .or(z.literal("")),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  reportKey: z.enum(reportKeys).optional(),
  teamEmployeeIds: z.array(z.string().uuid()).optional(),
  recruitmentDepartmentIds: z.array(z.string().uuid()).optional(),
});

export const reportScheduleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  reportKey: z.enum(reportKeys),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  exportFormat: z.enum(["csv", "excel", "pdf"]),
  recipients: z
    .array(z.string().email())
    .min(1, "Add at least one recipient email"),
  isEnabled: z.boolean().default(true),
  filters: reportFiltersSchema.optional(),
});

export const reportsSettingsSchema = z.object({
  defaultExportFormat: z.enum(["csv", "excel", "pdf"]),
  defaultDateRangeDays: z.coerce.number().int().min(7).max(365),
  enabledModules: z
    .array(
      z.enum([
        "hr",
        "attendance",
        "leave",
        "payroll",
        "performance",
        "recruitment",
        "assets",
        "exit",
      ]),
    )
    .min(1),
  scheduleEmailEnabled: z.boolean(),
  scheduleRetainRuns: z.coerce.number().int().min(7).max(3650),
});

export type ReportFiltersValues = z.infer<typeof reportFiltersSchema>;
export type ReportScheduleValues = z.infer<typeof reportScheduleSchema>;
export type ReportsSettingsFormValues = z.infer<typeof reportsSettingsSchema>;
export type ReportsSettingsFormInput = z.input<typeof reportsSettingsSchema>;
