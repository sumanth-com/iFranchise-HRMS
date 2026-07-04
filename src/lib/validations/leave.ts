import { z } from "zod";

export const leaveStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "withdrawn",
]);

export const halfDayPeriodSchema = z.enum(["morning", "afternoon"]);

export const leaveListParamsSchema = z.object({
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
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  leaveStatus: leaveStatusSchema.optional(),
  leaveTypeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  approverId: z.string().uuid().optional(),
  employmentTypeId: z.string().uuid().optional(),
  reportingManagerId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  employmentStatus: z.string().trim().optional(),
  isHalfDay: z
    .enum(["true", "false"])
    .optional()
    .transform((value) =>
      value === "true" ? true : value === "false" ? false : undefined,
    ),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  createdByEmployeeId: z.string().uuid().optional(),
});

export const leaveFormSchema = z
  .object({
    employeeId: z.string().uuid("Select an employee"),
    leaveTypeId: z.string().uuid("Select a leave type"),
    startDate: z
      .string()
      .min(1, "Start date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    endDate: z
      .string()
      .min(1, "End date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    isHalfDay: z.boolean().default(false),
    halfDayPeriod: halfDayPeriodSchema.optional().or(z.literal("")),
    reason: z.string().min(3, "Reason is required").max(1000),
    emergencyContactName: z.string().max(120).optional().or(z.literal("")),
    emergencyContactPhone: z.string().max(20).optional().or(z.literal("")),
    attachmentPath: z.string().max(500).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after start date",
        path: ["endDate"],
      });
    }

    if (value.isHalfDay) {
      if (value.startDate !== value.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Half day leave must be for a single date",
          path: ["endDate"],
        });
      }
      if (!value.halfDayPeriod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select half day period",
          path: ["halfDayPeriod"],
        });
      }
    }
  });

export const leaveApprovalSchema = z.object({
  leaveRequestId: z.string().uuid(),
  comments: z.string().max(500).optional().or(z.literal("")),
});

export const leaveRejectSchema = leaveApprovalSchema.extend({
  comments: z.string().min(3, "Rejection reason is required").max(500),
});

export type LeaveFormInput = z.infer<typeof leaveFormSchema>;
export type LeaveApprovalInput = z.infer<typeof leaveApprovalSchema>;
export type LeaveRejectInput = z.infer<typeof leaveRejectSchema>;
