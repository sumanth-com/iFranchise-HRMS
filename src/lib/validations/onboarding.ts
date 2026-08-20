import { z } from "zod";

import { MAX_SIGNATURE_DATA_LENGTH } from "@/lib/security/upload-validation";
import { optionalNullablePhoneSchema } from "@/lib/validations/phone";

const nullIfEmpty = (value: string | null | undefined) =>
  value === "" || value === undefined || value === null ? null : value;

const optionalUuid = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .optional()
  .transform(nullIfEmpty);

const optionalTrimmedText = (max: number) =>
  z
    .union([z.string().max(max), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === undefined || value === null) return null;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    });

export const createOnboardingCaseSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  personalEmail: z.string().trim().email().max(255),
  mobileNumber: optionalNullablePhoneSchema.transform(nullIfEmpty),
  designationId: z.string().uuid(),
  departmentId: z.string().uuid(),
  reportingManagerId: optionalUuid,
  employmentTypeId: z.string().uuid(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workLocationId: optionalUuid,
  branchId: z.string().uuid(),
  employmentCategory: optionalTrimmedText(100),
  offerReferenceNumber: optionalTrimmedText(100),
  intendedRoleId: z.string().uuid(),
});

/** HR new-hire form — branch and portal role are resolved automatically at invite. */
export const createOnboardingCaseFormSchema = createOnboardingCaseSchema.omit({
  branchId: true,
  intendedRoleId: true,
});

export const onboardingListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  status: z.string().optional(),
  roleId: z.string().uuid().optional(),
});

export const onboardingSectionSchema = z.object({
  caseId: z.string().uuid(),
  sectionKey: z.string().trim().min(1),
  data: z.record(z.string(), z.unknown()),
  markComplete: z.boolean().optional(),
});

export const onboardingDocumentReviewSchema = z.object({
  documentId: z.string().uuid(),
  reviewStatus: z.enum(["approved", "rejected", "correction_requested"]),
  hrComment: z.string().trim().max(500).optional().nullable(),
});

export const onboardingReviewSchema = z
  .object({
    caseId: z.string().uuid(),
    action: z.enum(["approve", "reject", "request_corrections"]),
    hrComments: z.string().trim().max(2000).optional().nullable(),
    correctionNotes: z.string().trim().max(2000).optional().nullable(),
    intendedRoleId: z.string().uuid().optional().nullable(),
    companyEmail: z.string().trim().email().max(255).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "approve" && !value.companyEmail?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Company email is required when approving onboarding",
        path: ["companyEmail"],
      });
    }
  });

export const candidatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters")
      .max(128),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const candidateLoginSchema = z.object({
  personalEmail: z.string().trim().email(),
  password: z.string().min(1),
});

export const candidateOtpRequestSchema = z.object({
  personalEmail: z.string().trim().email(),
});

export const candidateOtpVerifySchema = z.object({
  personalEmail: z.string().trim().email(),
  otp: z.string().trim().length(6),
});

export const onboardingSignatureSchema = z.object({
  caseId: z.string().uuid(),
  signatureType: z.enum(["typed", "drawn", "uploaded"]),
  signatureStyle: z.string().optional().nullable(),
  signatureData: z.string().min(1).max(MAX_SIGNATURE_DATA_LENGTH),
});

export const policyAcknowledgementSchema = z.object({
  caseId: z.string().uuid(),
  policyCodes: z.array(z.string()),
});

export const agreementAcceptanceSchema = z.object({
  caseId: z.string().uuid(),
  agreementTypes: z.array(z.string()),
});

export type CreateOnboardingCaseInput = z.infer<typeof createOnboardingCaseSchema>;
export type CreateOnboardingCaseFormInput = z.input<typeof createOnboardingCaseFormSchema>;
