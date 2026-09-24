import { z } from "zod";

import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { MANUAL_ATTENDANCE_UI_STATUSES } from "@/lib/attendance/manual-status";

export const attendanceStatusSchema = z.enum([
  "present",
  "absent",
  "half_day",
  "late",
  "on_leave",
  "holiday",
  "week_off",
]);

/** List/filter dropdown values — sheet-aligned UI statuses + legacy DB values. */
export const attendanceListStatusFilterSchema = z.enum([
  ...MANUAL_ATTENDANCE_UI_STATUSES,
  "half_day",
  "late",
  "on_leave",
  "week_off",
]);

export const attendanceListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
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
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  attendanceStatus: attendanceListStatusFilterSchema.optional(),
  employeeId: z.string().uuid().optional(),
}).transform((value) => {
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

  if (dateFrom && dateFrom > today) {
    dateFrom = today;
  }

  if (dateTo && dateTo > today) {
    dateTo = today;
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

const attendanceTimeSchema = z.string().optional().or(z.literal(""));

export const manualAttendanceStatusSchema = z.object({
  employeeId: z.string().uuid("Select an employee"),
  attendanceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  attendanceStatus: z.enum(MANUAL_ATTENDANCE_UI_STATUSES),
});

export type ManualAttendanceStatusInput = z.infer<typeof manualAttendanceStatusSchema>;

const attendanceFormFieldsSchema = z.object({
  employeeId: z.string().uuid("Select an employee"),
  attendanceDate: z
    .string()
    .min(1, "Attendance date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  checkInAt: attendanceTimeSchema,
  checkOutAt: attendanceTimeSchema,
  overtimeHours: z.number().min(0).max(24),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

function refineCheckOutAfterCheckIn(
  value: { checkInAt?: string; checkOutAt?: string },
  ctx: z.RefinementCtx,
) {
  if (value.checkInAt && value.checkOutAt && value.checkOutAt < value.checkInAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Check out must be after check in",
      path: ["checkOutAt"],
    });
  }
}

export const attendanceFormSchema = attendanceFormFieldsSchema
  .extend({
    attendanceStatus: attendanceStatusSchema,
  })
  .superRefine(refineCheckOutAfterCheckIn);

export type AttendanceFormInput = z.infer<typeof attendanceFormSchema>;

/** HR create/edit form Status selector — UI values mapped to stored status on submit. */
export const manualAttendanceFormSchema = attendanceFormFieldsSchema
  .extend({
    attendanceStatus: z.enum(MANUAL_ATTENDANCE_UI_STATUSES),
  })
  .superRefine(refineCheckOutAfterCheckIn);

export type ManualAttendanceFormInput = z.infer<typeof manualAttendanceFormSchema>;
