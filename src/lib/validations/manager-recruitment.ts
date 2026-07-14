import { z } from "zod";

import {
  interviewCompleteSchema,
  interviewFormSchema,
} from "@/lib/validations/recruitment";

export const teamRecruitmentListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  employeeId: z.string().uuid().optional(),
  jobOpeningId: z.string().uuid().optional(),
  stage: z
    .enum(["applied", "screening", "technical", "hr", "ceo", "offer", "joined", "rejected"])
    .optional(),
  departmentId: z.string().uuid().optional(),
  interviewStatus: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  view: z.enum(["candidates", "jobs"]).default("candidates"),
});

export const teamRecruitmentCandidateIdSchema = z.object({
  candidateId: z.string().uuid(),
});

export const teamRecruitmentInterviewIdSchema = z.object({
  interviewId: z.string().uuid(),
});

export const teamRecruitmentOfferIdSchema = z.object({
  offerId: z.string().uuid(),
});

export const managerInterviewScheduleSchema = interviewFormSchema.extend({
  candidateId: z.string().uuid(),
});

export const managerInterviewRescheduleSchema = z.object({
  interviewId: z.string().uuid(),
  roundName: z.string().min(1).max(100),
  interviewDate: z.string().min(1),
  interviewTime: z.string().min(1),
  meetingLink: z.string().max(500).optional().nullable(),
  interviewType: z.enum(["offline", "google_meet", "zoom", "teams"]).default("offline"),
  durationMinutes: z.coerce.number().int().min(15).max(240).optional(),
  interviewerEmployeeId: z.string().uuid().optional(),
});

const competencyRatingSchema = z.coerce.number().int().min(1).max(5).optional();

export const managerInterviewEvaluationSchema = z.object({
  interviewId: z.string().uuid(),
  competencies: z.object({
    technicalSkills: competencyRatingSchema,
    problemSolving: competencyRatingSchema,
    communication: competencyRatingSchema,
    cultureFit: competencyRatingSchema,
    leadership: competencyRatingSchema,
    confidence: competencyRatingSchema,
  }),
  overallRecommendation: z.enum(["strong_hire", "hire", "hold", "reject"]),
  strengths: z.string().max(5000).optional().nullable(),
  improvements: z.string().max(5000).optional().nullable(),
  confidentialNotes: z.string().max(5000).optional().nullable(),
  draft: z.boolean().default(false),
});

export const managerInterviewEvaluationSubmitSchema = managerInterviewEvaluationSchema.extend({
  draft: z.literal(false),
});

export const managerFeedbackSchema = z.object({
  candidateId: z.string().uuid(),
  feedbackType: z.enum(["positive", "constructive", "recognition", "coaching", "private"]),
  content: z.string().min(1).max(5000),
  draft: z.boolean().default(false),
});

export const managerCandidateRecommendSchema = z.object({
  candidateId: z.string().uuid(),
  recommendation: z.enum(["next_round", "offer", "reject"]),
  notes: z.string().max(5000).optional().nullable(),
});

export const managerOfferRecommendationSchema = z.object({
  offerId: z.string().uuid(),
  recommendation: z.enum(["approve", "revise", "reject"]),
  notes: z.string().max(5000).optional().nullable(),
});

export const managerRejectCandidateSchema = z.object({
  candidateId: z.string().uuid(),
  reason: z.string().min(3, "Rejection reason is required").max(1000),
});

export { interviewCompleteSchema };
