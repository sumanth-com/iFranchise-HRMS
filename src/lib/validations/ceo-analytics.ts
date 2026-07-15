import { z } from "zod";

export const ceoAnalyticsListParamsSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  employmentTypeId: z.string().uuid().optional(),
  compareMode: z
    .enum(["none", "previous_month", "previous_quarter", "previous_year", "department"])
    .optional(),
  compareDepartmentId: z.string().uuid().optional(),
  comparePreviousPeriod: z
    .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === "boolean") return value;
      return value === "true" || value === "1";
    }),
});

export const ceoAnalyticsExportSchema = ceoAnalyticsListParamsSchema.extend({
  format: z.enum(["csv", "excel", "pdf", "summary_pdf"]),
});
