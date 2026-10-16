import { z } from "zod";

const designationFields = z
  .object({
    newDesignationId: z.string().uuid().optional().nullable(),
    newDesignationTitle: z.string().trim().min(1).max(120).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const hasId = Boolean(value.newDesignationId);
    const hasTitle = Boolean(value.newDesignationTitle?.trim());
    if (!hasId && !hasTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Full-time designation is required",
        path: ["newDesignationId"],
      });
    }
  });

export const employmentConfirmationDraftSchema = z
  .object({
    employeeId: z.string().uuid(),
    newGrossSalary: z.coerce.number().positive("Proposed salary must be greater than zero"),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date is required"),
    probationEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    confirmationId: z.string().uuid().optional(),
  })
  .and(designationFields);

export const employmentConfirmationConfirmSchema = employmentConfirmationDraftSchema;

export type EmploymentConfirmationDraftInput = z.infer<
  typeof employmentConfirmationDraftSchema
>;
