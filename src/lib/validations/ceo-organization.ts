import { z } from "zod";

import { employmentStatusSchema } from "@/lib/validations/employee";
import { paginationSchema } from "@/lib/validations/common";

export const ceoOrgListParamsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
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
