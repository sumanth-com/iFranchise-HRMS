import { z } from "zod";

import { paginationSchema } from "@/lib/validations/common";
import type { ExecutiveApprovalType } from "@/types/ceo-approvals";

const approvalTypes = [
  "senior_hiring",
  "department_creation",
  "department_closure",
  "budget_approval",
  "salary_revision",
  "executive_promotion",
  "organization_policy",
  "new_branch",
  "asset_purchase",
  "strategic_recruitment",
  "organization_structure",
] as const satisfies readonly ExecutiveApprovalType[];

const approvalTypeSchema = z.enum(approvalTypes);

const prioritySchema = z.enum(["low", "medium", "high", "critical"]);

const statusSchema = z.enum([
  "submitted",
  "reviewed",
  "escalated",
  "pending_ceo",
  "clarification_requested",
  "revision_requested",
  "approved",
  "rejected",
  "completed",
  "forwarded",
]);

export const ceoApprovalsListParamsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  approvalType: approvalTypeSchema.optional(),
  priority: prioritySchema.optional(),
  departmentId: z.string().uuid().optional(),
  status: statusSchema.optional(),
  requestedById: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const ceoApprovalsRequestIdSchema = z.object({
  requestId: z.string().uuid(),
});

export const ceoApprovalsDecisionSchema = z.object({
  requestId: z.string().uuid(),
  remarks: z.string().trim().max(2000).optional(),
  reason: z.string().trim().max(2000).optional(),
});

export const ceoApprovalsRejectSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
  remarks: z.string().trim().max(2000).optional(),
});

export const ceoApprovalsClarificationSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
  remarks: z.string().trim().max(2000).optional(),
});

export const ceoApprovalsRevisionSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().trim().min(3).max(2000),
  remarks: z.string().trim().max(2000).optional(),
});

export const ceoApprovalsCommentSchema = z.object({
  requestId: z.string().uuid(),
  comment: z.string().trim().min(1).max(2000),
  isExecutiveRemark: z.boolean().optional(),
});

export const ceoApprovalsForwardSchema = z.object({
  requestId: z.string().uuid(),
  forwardToEmployeeId: z.string().uuid(),
  remarks: z.string().trim().max(2000).optional(),
});
