import { z } from "zod";

import { paginationSchema } from "@/lib/validations/common";
import { REPORT_DEFINITIONS } from "@/lib/reports/constants";

const categories = [
  "attendance",
  "leave",
  "payroll",
  "recruitment",
  "performance",
  "department",
  "headcount",
  "attrition",
  "training",
  "organization",
  "executive_summary",
  "board",
  "compliance",
] as const;

const categorySchema = z.enum(categories);

const formatSchema = z.enum([
  "csv",
  "excel",
  "pdf",
  "summary_pdf",
  "board_summary",
]);

const reportKeys = [
  "hr_employee_master",
  ...REPORT_DEFINITIONS.map((d) => d.key).filter((key) => key !== "hr_employee_master"),
  "ceo_executive_summary",
  "ceo_board_report",
  "ceo_compliance_report",
  "ceo_organization_report",
  "ceo_headcount_report",
  "ceo_training_report",
] as [string, ...string[]];

export const ceoReportsListParamsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  category: categorySchema.optional(),
  departmentId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  format: formatSchema.optional(),
  createdById: z.string().uuid().optional(),
});

export const ceoReportGenerateSchema = z.object({
  reportKey: z.enum(reportKeys),
  format: formatSchema.default("pdf"),
  departmentId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  columns: z.array(z.string()).optional(),
  source: z.enum(["on_demand", "builder"]).optional(),
});

export const ceoReportRunIdSchema = z.object({
  runId: z.string().uuid(),
});

export const ceoReportDownloadSchema = z.object({
  runId: z.string().uuid(),
  format: formatSchema.optional(),
});

export const ceoReportShareSchema = z.object({
  runId: z.string().uuid(),
  recipientEmails: z.array(z.string().email()).min(1).max(20),
  message: z.string().trim().max(500).optional(),
});

export const ceoReportScheduleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  reportKey: z.enum(reportKeys),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  exportFormat: z.enum(["csv", "excel", "pdf"]),
  recipients: z.array(z.string().email()).min(1),
  isEnabled: z.boolean().default(true),
  departmentId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  scheduleId: z.string().uuid().optional(),
});

export const ceoReportScheduleToggleSchema = z.object({
  scheduleId: z.string().uuid(),
  isEnabled: z.boolean(),
});
