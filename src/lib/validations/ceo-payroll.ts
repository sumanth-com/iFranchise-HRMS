import { z } from "zod";

import { paginationSchema } from "@/lib/validations/common";

export const ceoPayrollListParamsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  employeeId: z.string().uuid().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  departmentId: z.string().uuid().optional(),
  employmentTypeId: z.string().uuid().optional(),
  payrollStatus: z
    .enum(["draft", "processing", "processed", "approved", "paid", "cancelled"])
    .optional(),
});

export const ceoPayrollEmployeeDetailSchema = z.object({
  employeeId: z.string().uuid(),
  payrollItemId: z.string().uuid().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
