import { z } from "zod";
import { paginationSchema } from "@/lib/validations/common";

export const performanceListParamsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  cycleId: z.string().uuid().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const goalListParamsSchema = performanceListParamsSchema.extend({
  goalStatus: z
    .enum(["draft", "not_started", "in_progress", "on_track", "at_risk", "completed", "cancelled"])
    .optional(),
  goalPriority: z.enum(["low", "medium", "high", "critical"]).optional(),
});

export const goalFormSchema = z.object({
  employeeId: z.string().uuid(),
  cycleId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  category: z.string().max(100).optional(),
  goalPriority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  weightage: z.coerce.number().min(0).max(100).default(0),
  targetValue: z.coerce.number().min(0).optional().nullable(),
  currentProgress: z.coerce.number().min(0).max(100).default(0),
  dueDate: z.string().optional().nullable(),
  goalStatus: z
    .enum(["draft", "not_started", "in_progress", "on_track", "at_risk", "completed", "cancelled"])
    .default("draft"),
  attachmentPath: z.string().optional().nullable(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        dueDate: z.string().optional().nullable(),
      }),
    )
    .optional()
    .default([]),
});

export const goalCommentSchema = z.object({
  goalId: z.string().uuid(),
  comment: z.string().min(1).max(2000),
});

export const goalProgressSchema = z.object({
  goalId: z.string().uuid(),
  currentProgress: z.coerce.number().min(0).max(100),
  goalStatus: z
    .enum(["draft", "not_started", "in_progress", "on_track", "at_risk", "completed", "cancelled"])
    .optional(),
});

export const kpiTemplateFormSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  departmentId: z.string().uuid().optional().nullable(),
  designationId: z.string().uuid().optional().nullable(),
  measurementType: z.enum(["number", "percentage", "rating", "currency"]).default("number"),
  targetValue: z.coerce.number().min(0).optional().nullable(),
  weightage: z.coerce.number().min(0).max(100).default(0),
  kpiPeriod: z.enum(["monthly", "quarterly", "half_yearly", "annual"]).default("quarterly"),
  isActive: z.boolean().default(true),
});

export const kpiListParamsSchema = performanceListParamsSchema.extend({
  designationId: z.string().uuid().optional(),
  kpiStatus: z.enum(["not_started", "in_progress", "completed", "overdue"]).optional(),
  kpiPeriod: z.enum(["monthly", "quarterly", "half_yearly", "annual"]).optional(),
});

export const kpiAssignFormSchema = z.object({
  employeeId: z.string().uuid(),
  templateId: z.string().uuid(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const kpiProgressSchema = z.object({
  kpiId: z.string().uuid(),
  currentValue: z.coerce.number().min(0),
  progressComments: z.string().max(2000).optional(),
  evidenceNotes: z.string().max(5000).optional(),
});

export const reviewListParamsSchema = performanceListParamsSchema.extend({
  reviewStatus: z
    .enum(["draft", "pending", "in_progress", "submitted", "approved", "rejected"])
    .optional(),
  reviewStage: z.enum(["self", "manager", "hr", "final"]).optional(),
});

export const reviewFormSchema = z.object({
  employeeId: z.string().uuid(),
  cycleId: z.string().uuid().optional().nullable(),
  reviewStage: z.enum(["self", "manager", "hr", "final"]).default("self"),
  overallRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  comments: z.string().max(5000).optional(),
  strengths: z.string().max(5000).optional(),
  weaknesses: z.string().max(5000).optional(),
  improvementPlan: z.string().max(5000).optional(),
});

export const reviewSubmitSchema = z.object({
  reviewId: z.string().uuid(),
  overallRating: z.coerce.number().int().min(1).max(5).optional(),
  comments: z.string().max(5000).optional(),
  strengths: z.string().max(5000).optional(),
  weaknesses: z.string().max(5000).optional(),
  improvementPlan: z.string().max(5000).optional(),
});

export const reviewApprovalSchema = z.object({
  reviewId: z.string().uuid(),
  comments: z.string().max(2000).optional(),
});

export const feedbackListParamsSchema = performanceListParamsSchema.extend({
  feedbackType: z.enum(["appreciation", "suggestion", "coaching", "warning"]).optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export const feedbackFormSchema = z.object({
  toEmployeeId: z.string().uuid(),
  feedbackType: z.enum(["appreciation", "suggestion", "coaching", "warning"]),
  visibility: z.enum(["public", "private"]).default("private"),
  message: z.string().min(1).max(5000),
});

export const oneOnOneListParamsSchema = performanceListParamsSchema.extend({
  meetingStatus: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]).optional(),
});

export const oneOnOneFormSchema = z.object({
  employeeId: z.string().uuid(),
  managerEmployeeId: z.string().uuid(),
  scheduledAt: z.string().min(1),
  agenda: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  followUpDate: z.string().optional().nullable(),
  meetingStatus: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]).default("scheduled"),
  actionItems: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        assignedToEmployeeId: z.string().uuid().optional().nullable(),
        dueDate: z.string().optional().nullable(),
      }),
    )
    .optional()
    .default([]),
});

export const promotionListParamsSchema = performanceListParamsSchema.extend({
  promotionStatus: z
    .enum(["draft", "pending", "recommended", "approved", "rejected", "applied", "cancelled"])
    .optional(),
});

export const promotionFormSchema = z.object({
  employeeId: z.string().uuid(),
  currentDesignationId: z.string().uuid().optional().nullable(),
  recommendedDesignationId: z.string().uuid().optional().nullable(),
  currentSalary: z.coerce.number().min(0).optional().nullable(),
  recommendedSalary: z.coerce.number().min(0).optional().nullable(),
  reason: z.string().max(5000).optional(),
});

export const promotionApprovalSchema = z.object({
  promotionId: z.string().uuid(),
  comments: z.string().max(2000).optional(),
});

export const reviewCycleFormSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  cycleStatus: z.enum(["draft", "active", "closed", "archived"]).default("draft"),
  isActive: z.boolean().default(false),
});

export const historyListParamsSchema = performanceListParamsSchema.extend({
  eventType: z
    .enum(["review", "promotion", "feedback", "goal", "salary_revision", "bonus"])
    .optional(),
});

export const performanceSettingsSchema = z.object({
  reviewCycles: z.object({
    defaultDurationMonths: z.coerce.number().int().min(1).max(24),
    selfReviewDays: z.coerce.number().int().min(1).max(90),
    managerReviewDays: z.coerce.number().int().min(1).max(90),
  }),
  ratingScale: z.object({
    min: z.coerce.number().int().min(1).max(5),
    max: z.coerce.number().int().min(1).max(10),
    labels: z.record(z.string(), z.string()),
  }),
  goalCategories: z.array(z.string().min(1).max(100)),
  kpiTemplates: z.array(z.string()),
  promotionRules: z.object({
    minRatingForPromotion: z.coerce.number().min(1).max(5),
    minTenureMonths: z.coerce.number().int().min(0).max(120),
    requireManagerApproval: z.boolean(),
    requireHrApproval: z.boolean(),
  }),
  notifications: z.object({
    reviewReminder: z.boolean(),
    goalDueReminder: z.boolean(),
    feedbackNotification: z.boolean(),
    promotionNotification: z.boolean(),
    oneOnOneReminder: z.boolean(),
  }),
});

export type PerformanceSettingsFormInput = z.input<typeof performanceSettingsSchema>;
export type PerformanceSettingsFormValues = z.output<typeof performanceSettingsSchema>;
