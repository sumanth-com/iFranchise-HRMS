import { z } from "zod";

import { leaveStatusSchema } from "@/lib/validations/leave";

export const teamLeaveListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z
    .enum([
      "employee_code",
      "start_date",
      "end_date",
      "total_days",
      "created_at",
      "leave_status",
    ])
    .default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  leaveStatus: leaveStatusSchema.optional(),
  leaveTypeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
    .optional(),
});

export const teamLeaveIdSchema = z.object({
  leaveRequestId: z.string().uuid(),
});

export const teamLeaveInfoRequestSchema = z.object({
  leaveRequestId: z.string().uuid(),
  message: z.string().min(3).max(2000),
});

export const teamLeaveCalendarParamsSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
