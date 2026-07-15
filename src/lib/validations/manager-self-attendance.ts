import { z } from "zod";

export const managerAttendancePunchSchema = z.object({
  type: z.enum(["in", "out"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const managerUpdateCheckoutSchema = z.object({
  attendanceId: z.string().uuid().optional(),
  checkOutAt: z.string().optional(),
});

export const managerProfilePageParamsSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z
    .enum([
      "present",
      "absent",
      "half_day",
      "late",
      "on_leave",
      "holiday",
      "week_off",
    ])
    .optional(),
  searchDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(31),
});

export const managerAttendanceRegularizationSchema = z.object({
  attendanceId: z.string().uuid().optional(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestedCheckInAt: z.string().optional(),
  requestedCheckOutAt: z.string().optional(),
  reason: z.string().trim().min(5, "Reason must be at least 5 characters"),
});

export type ManagerAttendancePunchInput = z.infer<
  typeof managerAttendancePunchSchema
>;
export type ManagerUpdateCheckoutInput = z.infer<
  typeof managerUpdateCheckoutSchema
>;
export type ManagerProfilePageParams = z.infer<
  typeof managerProfilePageParamsSchema
>;
export type ManagerAttendanceRegularizationInput = z.infer<
  typeof managerAttendanceRegularizationSchema
>;
