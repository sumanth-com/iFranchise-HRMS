import { z } from "zod";

import { paginationSchema } from "@/lib/validations/common";

export const ceoPerformanceListParamsSchema = paginationSchema
  .extend({
    search: z.string().trim().optional(),
    employeeId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    managerId: z.string().uuid().optional(),
    cycleId: z.string().uuid().optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    employmentTypeId: z.string().uuid().optional(),
  })
  // Internal aggregations (top performers / risks / heatmap) load up to 500 rows.
  .extend({
    pageSize: z.coerce.number().int().min(1).max(1000).default(10),
  });

export const ceoPerformanceEmployeeIdSchema = z.object({
  employeeId: z.string().uuid(),
});
