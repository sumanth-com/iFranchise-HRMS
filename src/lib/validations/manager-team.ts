import { z } from "zod";

import { employmentStatusSchema } from "@/lib/validations/employee";
import { paginationSchema } from "@/lib/validations/common";

export const teamListParamsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  departmentId: z.string().uuid().optional(),
  designationId: z.string().uuid().optional(),
  employmentStatus: employmentStatusSchema.optional(),
  employmentTypeId: z.string().uuid().optional(),
  sortBy: z
    .enum(["first_name", "employee_code", "date_of_joining", "employment_status"])
    .default("first_name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const teamMemberIdSchema = z.object({
  employeeId: z.string().uuid(),
});

export const teamLeaveApprovalSchema = z.object({
  leaveRequestId: z.string().uuid(),
  comments: z.string().max(2000).optional(),
});

export const teamLeaveRejectSchema = teamLeaveApprovalSchema.extend({
  reason: z.string().min(1).max(2000),
});

export const teamCorrectionReviewSchema = z.object({
  correctionId: z.string().uuid(),
  reviewNotes: z.string().max(2000).optional(),
});
