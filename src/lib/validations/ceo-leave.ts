import { z } from "zod";

const leaveStatusEnum = z.enum([
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "withdrawn",
]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .optional();

export const ceoLeaveFiltersSchema = z.object({
  departmentId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  leaveTypeId: z.string().uuid().optional(),
  leaveStatus: leaveStatusEnum.optional(),
  reportingManagerId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
  dateFrom: isoDate,
  dateTo: isoDate,
});

export type CeoLeaveFiltersInput = z.infer<typeof ceoLeaveFiltersSchema>;

export const ceoLeaveDecisionSchema = z.object({
  leaveRequestId: z.string().uuid("Invalid leave request"),
  comments: z.string().trim().max(1000).optional(),
});

export const ceoLeaveRejectSchema = z.object({
  leaveRequestId: z.string().uuid("Invalid leave request"),
  comments: z
    .string()
    .trim()
    .min(3, "Provide a rejection reason")
    .max(1000),
});

export const ceoLeaveForwardSchema = z.object({
  leaveRequestId: z.string().uuid("Invalid leave request"),
  targetEmployeeId: z.string().uuid("Select an approver to forward to"),
  note: z.string().trim().max(1000).optional(),
});

export const ceoLeaveCalendarSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});
