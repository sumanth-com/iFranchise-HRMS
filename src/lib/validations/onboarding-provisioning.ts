import { z } from "zod";

export const provisionOnboardingCandidateSchema = z.object({
  caseId: z.string().uuid("Select a completed onboarding candidate"),
  companyEmail: z.string().trim().toLowerCase().email("Enter a valid company email"),
  roleId: z.string().uuid("Select a portal role"),
  hrComments: z.string().trim().max(2000).optional().nullable(),
  salaryEffectiveFrom: z.string().min(1, "Salary effective date is required"),
  salaryEffectiveTo: z.string().optional().nullable(),
  currencyCode: z.string().length(3).default("INR"),
  basicSalary: z.coerce.number().positive("Basic salary must be greater than zero"),
  hraAmount: z.coerce.number().min(0).default(0),
  transportAllowance: z.coerce.number().min(0).default(0),
  otherAllowances: z.coerce.number().min(0).default(0),
});

export type ProvisionOnboardingCandidateInput = z.infer<
  typeof provisionOnboardingCandidateSchema
>;
