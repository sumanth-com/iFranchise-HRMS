import { z } from "zod";

import { employmentStatusSchema } from "@/lib/validations/employee";
import { paginationSchema } from "@/lib/validations/common";

export const ceoOrgListParamsSchema = paginationSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(8),
  search: z.string().trim().optional(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  employmentStatus: employmentStatusSchema.optional(),
  employmentTypeId: z.string().uuid().optional(),
  sortBy: z
    .enum(["first_name", "employee_code", "date_of_joining", "employment_status"])
    .default("first_name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const ceoOrgEmployeeIdSchema = z.object({
  employeeId: z.string().uuid(),
});
