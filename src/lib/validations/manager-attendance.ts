import { z } from "zod";

import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { attendanceStatusSchema } from "@/lib/validations/attendance";

export const teamAttendanceListParamsSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    sortBy: z
      .enum([
        "employee_code",
        "attendance_date",
        "check_in_at",
        "check_out_at",
        "work_hours",
        "attendance_status",
      ])
      .default("attendance_date"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
      .optional(),
    departmentId: z.string().uuid().optional(),
    employmentTypeId: z.string().uuid().optional(),
    attendanceStatus: attendanceStatusSchema.optional(),
    employeeId: z.string().uuid().optional(),
  })
  .transform((value) => {
    const today = getTodayDateString();
    let { dateFrom, dateTo } = value;

    if (!dateFrom && !dateTo) {
      dateFrom = today;
      dateTo = today;
    } else if (dateFrom && !dateTo) {
      dateTo = today;
    } else if (!dateFrom && dateTo) {
      dateFrom = dateTo;
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      return {
        ...value,
        dateFrom: dateTo,
        dateTo: dateFrom,
      };
    }

    return {
      ...value,
      dateFrom,
      dateTo,
    };
  });

export const teamAttendanceIdSchema = z.object({
  attendanceId: z.string().uuid(),
});

export const teamAttendanceMonthSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
