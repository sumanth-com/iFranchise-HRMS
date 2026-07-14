import { z } from "zod";

import { goalFormSchema } from "@/lib/validations/performance";

export const teamPerformanceListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  cycleId: z.string().uuid().optional(),
  reviewStatus: z
    .enum(["draft", "pending", "in_progress", "submitted", "approved", "rejected"])
    .optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  sortBy: z
    .enum(["employee_code", "current_rating", "last_review"])
    .default("employee_code"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const teamPerformanceEmployeeIdSchema = z.object({
  employeeId: z.string().uuid(),
});

export const teamPerformanceReviewIdSchema = z.object({
  reviewId: z.string().uuid(),
});

export const teamPerformanceGoalIdSchema = z.object({
  goalId: z.string().uuid(),
});

export const competencyRatingsSchema = z.object({
  communication: z.coerce.number().int().min(1).max(5).optional(),
  technicalSkills: z.coerce.number().int().min(1).max(5).optional(),
  ownership: z.coerce.number().int().min(1).max(5).optional(),
  teamwork: z.coerce.number().int().min(1).max(5).optional(),
  problemSolving: z.coerce.number().int().min(1).max(5).optional(),
  leadership: z.coerce.number().int().min(1).max(5).optional(),
  discipline: z.coerce.number().int().min(1).max(5).optional(),
  innovation: z.coerce.number().int().min(1).max(5).optional(),
});

export const teamPerformanceReviewDraftSchema = z.object({
  reviewId: z.string().uuid(),
  overallRating: z.coerce.number().int().min(1).max(5).optional(),
  strengths: z.string().max(5000).optional(),
  weaknesses: z.string().max(5000).optional(),
  improvementPlan: z.string().max(5000).optional(),
  managerNotes: z.string().max(5000).optional(),
  competencies: competencyRatingsSchema.optional(),
  recommendPromotion: z.boolean().optional(),
  recommendTraining: z.boolean().optional(),
  recommendPip: z.boolean().optional(),
});

export const teamPerformanceReviewSubmitSchema = teamPerformanceReviewDraftSchema;

export const teamPerformanceReviewStartSchema = z.object({
  employeeId: z.string().uuid(),
  cycleId: z.string().uuid().optional().nullable(),
});

export const teamPerformanceGoalUpdateSchema = goalFormSchema.extend({
  goalId: z.string().uuid(),
});
