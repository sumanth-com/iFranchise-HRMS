import { z } from "zod";

import { paginationSchema } from "@/lib/validations/common";

export const ceoAttendanceListParamsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  employmentTypeId: z.string().uuid().optional(),
  attendanceStatus: z
    .enum(["present", "absent", "half_day", "late", "on_leave", "holiday", "week_off"])
    .optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const ceoAttendanceEmployeeIdSchema = z.object({
  employeeId: z.string().uuid(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
