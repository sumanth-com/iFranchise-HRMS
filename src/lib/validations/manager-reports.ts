import { z } from "zod";

import { reportFiltersSchema } from "@/lib/validations/reports";

export const managerReportsListParamsSchema = reportFiltersSchema.extend({
  category: z
    .enum(["attendance", "leave", "performance", "recruitment", "training", "team"])
    .optional(),
});

export const managerReportExportSchema = z.object({
  reportKey: z.string().min(1),
  format: z.enum(["csv", "excel", "pdf"]),
  filters: reportFiltersSchema.optional(),
});
