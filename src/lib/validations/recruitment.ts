import { z } from "zod";

import { optionalNullablePhoneSchema, requiredPhoneSchema } from "@/lib/validations/phone";

const uuidOptional = z.string().uuid().optional().nullable().or(z.literal(""));

export const recruitmentListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
});

export const jobListParamsSchema = recruitmentListParamsSchema.extend({
  departmentId: z.string().uuid().optional(),
  jobStatus: z.enum(["draft", "open", "paused", "closed"]).optional(),
  employmentTypeId: z.string().uuid().optional(),
  location: z.string().trim().optional(),
});

export const jobFormSchema = z
  .object({
    title: z.string().min(1, "Job title is required").max(200),
    departmentId: uuidOptional,
    designationId: z.string().optional().nullable().or(z.literal("")),
    customDesignationTitle: z.string().max(150).optional().nullable().or(z.literal("")),
    employmentTypeId: uuidOptional,
    experienceMin: z.coerce.number().min(0).optional().nullable(),
    experienceMax: z.coerce.number().min(0).optional().nullable(),
    salaryMin: z.coerce.number().min(0).optional().nullable(),
    salaryMax: z.coerce.number().min(0).optional().nullable(),
    openPositions: z.coerce.number().int().min(1).default(1),
    location: z.string().max(200).optional().nullable(),
    workMode: z.enum(["onsite", "hybrid", "remote"]).default("onsite"),
    hiringManagerId: uuidOptional,
    requiredSkills: z.string().max(2000).optional().nullable(),
    jobDescription: z.string().max(10000).optional().nullable(),
    jobStatus: z.enum(["draft", "open", "paused", "closed"]).default("draft"),
  })
  .superRefine((data, ctx) => {
    if (data.designationId === "others") {
      if (!data.customDesignationTitle?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["customDesignationTitle"],
          message: "Enter a designation title",
        });
      }
    } else if (data.designationId && data.designationId.length > 0) {
      const uuidCheck = z.string().uuid().safeParse(data.designationId);
      if (!uuidCheck.success) {
        ctx.addIssue({
          code: "custom",
          path: ["designationId"],
          message: "Select a valid designation",
        });
      }
    }
  });

export const candidateListParamsSchema = recruitmentListParamsSchema.extend({
  departmentId: z.string().uuid().optional(),
  jobOpeningId: z.string().uuid().optional(),
  stage: z
    .enum(["applied", "screening", "technical", "hr", "ceo", "offer", "joined", "rejected"])
    .optional(),
  source: z.string().trim().optional(),
  offerQueue: z.enum(["all", "pending", "sent", "accepted"]).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const candidateFormSchema = z.object({
  jobOpeningId: z.string().uuid("Select a job position"),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(255),
  phone: optionalNullablePhoneSchema,
  experienceYears: z.coerce.number().min(0).optional().nullable(),
  skills: z.string().max(2000).optional().nullable(),
  currentCompany: z.string().max(200).optional().nullable(),
  currentCtc: z.coerce.number().min(0).optional().nullable(),
  expectedCtc: z.coerce.number().min(0).optional().nullable(),
  noticePeriodDays: z.coerce.number().int().min(0).optional().nullable(),
  noticePeriod: z.string().max(50).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const moveStageSchema = z.object({
  candidateId: z.string().uuid(),
  stage: z.enum([
    "applied",
    "screening",
    "technical",
    "hr",
    "ceo",
    "offer",
    "joined",
    "rejected",
  ]),
  reason: z.string().max(1000).optional().nullable(),
});

export const interviewListParamsSchema = recruitmentListParamsSchema.extend({
  jobOpeningId: z.string().uuid().optional(),
  interviewStatus: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  interviewerId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const interviewFormSchema = z.object({
  candidateId: z.string().uuid(),
  interviewerEmployeeId: z.string().uuid("Select interviewer"),
  roundName: z.string().min(1).max(100),
  interviewDate: z.string().min(1),
  interviewTime: z.string().min(1),
  meetingLink: z.string().max(500).optional().nullable(),
  interviewType: z.enum(["offline", "google_meet", "zoom", "teams"]).default("offline"),
  durationMinutes: z.coerce.number().int().min(15).max(240).optional(),
  emailTemplateId: z.string().max(80).optional().nullable(),
  emailSubject: z.string().max(500).optional().nullable(),
  emailMessage: z.string().max(10000).optional().nullable(),
});

export const interviewCompleteSchema = z.object({
  interviewId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comments: z.string().max(5000).optional().nullable(),
  recommendation: z.enum(["reject", "next_round", "offer"]),
});

export const offerListParamsSchema = recruitmentListParamsSchema.extend({
  jobOpeningId: z.string().uuid().optional(),
  offerStatus: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
  departmentId: z.string().uuid().optional(),
});

export const offerFormSchema = z.object({
  candidateId: z.string().uuid(),
  departmentId: uuidOptional,
  designationId: uuidOptional,
  branchId: uuidOptional,
  employmentTypeId: uuidOptional,
  reportingManagerId: uuidOptional,
  expiresAt: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  emailSubject: z.string().max(500).optional().default(""),
  emailMessage: z.string().max(10000).optional().default(""),
  sendNow: z.boolean().optional().default(false),
});

export const deleteOfferLetterSchema = z.object({
  offerId: z.string().uuid(),
});

export const OFFER_LETTER_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Any non-empty filename is accepted; size is enforced separately. */
export function isAllowedOfferLetterFilename(filename: string): boolean {
  return filename.trim().length > 0 && !filename.includes("..");
}

export function assertOfferLetterFile(file: { name: string; size: number }): void {
  if (!isAllowedOfferLetterFilename(file.name)) {
    throw new Error("Choose a valid offer letter file to upload");
  }
  if (file.size <= 0) {
    throw new Error("The selected file is empty. Choose another file.");
  }
  if (file.size > OFFER_LETTER_MAX_BYTES) {
    throw new Error("Offer letter must be 10 MB or smaller");
  }
}

export const offerStatusSchema = z.object({
  offerId: z.string().uuid(),
  offerStatus: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
});

export const recruitmentSettingsSchema = z.object({
  candidateSources: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1).max(100),
        enabled: z.boolean(),
      }),
    )
    .min(1, "At least one candidate source is required"),
  defaultHiringManagerId: z.string().uuid().nullable().optional(),
  defaultInterviewDurationMinutes: z.union([
    z.literal(30),
    z.literal(45),
    z.literal(60),
    z.literal(90),
  ]),
  noticePeriodOptions: z.array(z.string().min(1).max(50)).min(1),
  autoEmployeeCreation: z.boolean(),
  autoArchiveRejectedDays: z.union([
    z.literal(30),
    z.literal(60),
    z.literal(90),
    z.literal(180),
  ]),
  emailNotifications: z.object({
    interviewScheduled: z.boolean(),
    interviewCancelled: z.boolean(),
    offerSent: z.boolean(),
    offerAccepted: z.boolean(),
    offerRejected: z.boolean(),
    joiningReminder: z.boolean(),
  }),
  numberFormats: z.object({
    candidatePrefix: z
      .string()
      .min(1)
      .max(10)
      .regex(/^[A-Za-z]+$/, "Prefix must contain letters only"),
    jobPrefix: z
      .string()
      .min(1)
      .max(10)
      .regex(/^[A-Za-z]+$/, "Prefix must contain letters only"),
    offerPrefix: z
      .string()
      .min(1)
      .max(10)
      .regex(/^[A-Za-z]+$/, "Prefix must contain letters only"),
  }),
  offerEmailDefaults: z.object({
    subjectTemplate: z.string().min(1, "Email subject is required").max(500),
    messageTemplate: z.string().min(1, "Email message is required").max(10000),
    hrEmail: z.string().email("Enter a valid HR email").max(200),
    hrPhone: requiredPhoneSchema,
  }),
});

export type RecruitmentSettingsFormValues = z.infer<typeof recruitmentSettingsSchema>;
export type RecruitmentSettingsFormInput = z.input<typeof recruitmentSettingsSchema>;
