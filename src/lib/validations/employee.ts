import { z } from "zod";

import { DESIGNATION_OTHER_VALUE } from "@/lib/employees/constants";
import type { EmploymentStatus } from "@/types/auth";
import type { EmployeeAccountStatus } from "@/types/employee";

export const employmentStatusSchema = z.enum([
  "draft",
  "probation",
  "active",
  "on_leave",
  "suspended",
  "terminated",
  "resigned",
] satisfies [EmploymentStatus, ...EmploymentStatus[]]);

export const employeeAccountStatusSchema = z.enum([
  "draft",
  "invited",
  "invitation_pending",
  "active",
  "inactive",
  "suspended",
] satisfies [EmployeeAccountStatus, ...EmployeeAccountStatus[]]);

export const genderTypeSchema = z.enum([
  "male",
  "female",
  "other",
  "prefer_not_to_say",
]);

export const maritalStatusSchema = z.enum([
  "single",
  "married",
  "divorced",
  "widowed",
  "other",
]);

export const addressTypeSchema = z.enum(["current", "permanent", "work"]);

export const employeeListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(8),
  search: z.string().trim().optional(),
  sortBy: z
    .enum([
      "employee_code",
      "first_name",
      "last_name",
      "email",
      "date_of_joining",
      "employment_status",
      "account_status",
      "last_login_at",
    ])
    .default("employee_code"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  department: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .optional(),
  employmentStatus: employmentStatusSchema.optional(),
  accountStatus: employeeAccountStatusSchema.optional(),
});

export const employeeBasicStepSchema = z.object({
  employeeCode: z
    .string()
    .min(1, "Employee code is required")
    .max(50, "Employee code is too long"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Enter a valid company email"),
  phone: z.string().max(30).optional(),
  dateOfBirth: z.string().optional(),
  gender: genderTypeSchema.optional(),
  maritalStatus: maritalStatusSchema.optional(),
  nationality: z.string().max(100).optional(),
  bloodGroup: z.string().max(10).optional(),
  personalEmail: z.string().email().optional().or(z.literal("")),
  personalPhone: z.string().max(30).optional(),
  bio: z.string().max(1000).optional(),
});

export const employeeEmploymentStepSchema = z.object({
  branchId: z.string().uuid("Select a branch"),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  designationId: z.string().uuid().optional().or(z.literal("")),
  employmentTypeId: z.string().uuid().optional().or(z.literal("")),
  reportingManagerId: z.string().uuid().optional().or(z.literal("")),
  employmentStatus: employmentStatusSchema,
  dateOfJoining: z.string().optional(),
  dateOfLeaving: z.string().optional(),
});

export const employeeAddressStepSchema = z.object({
  addressType: addressTypeSchema.default("current"),
  addressLine1: z.string().min(1, "Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(1, "Country is required").default("IN"),
  isPrimary: z.boolean().default(true),
});

export const employeeEmergencyContactStepSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  isPrimary: z.boolean().default(true),
});

export const employeeDocumentItemSchema = z.object({
  title: z.string().min(1, "Document title is required"),
  documentTypeId: z.string().uuid("Select a document type"),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  storagePath: z.string().min(1),
  issuedDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

export const employeeWizardSchema = z.object({
  basic: employeeBasicStepSchema,
  employment: employeeEmploymentStepSchema,
  address: employeeAddressStepSchema,
  emergencyContact: employeeEmergencyContactStepSchema,
  documents: z.array(employeeDocumentItemSchema).default([]),
});

export const employeeUpdateSchema = z
  .object({
    employeeCode: z.string().min(1).max(50),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().max(30).optional().or(z.literal("")),
    branchId: z.string().uuid(),
    departmentId: z.string().uuid().optional().or(z.literal("")),
    designationId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .or(z.literal(DESIGNATION_OTHER_VALUE)),
    customDesignationTitle: z.string().max(100).optional().or(z.literal("")),
    employmentTypeId: z.string().uuid().optional().or(z.literal("")),
    reportingManagerId: z.string().uuid().optional().or(z.literal("")),
    employmentStatus: employmentStatusSchema,
    dateOfJoining: z.string().optional().or(z.literal("")),
    dateOfLeaving: z.string().optional().or(z.literal("")),
    dateOfBirth: z.string().optional().or(z.literal("")),
    gender: genderTypeSchema.optional(),
    maritalStatus: maritalStatusSchema.optional(),
    nationality: z.string().max(100).optional().or(z.literal("")),
    bloodGroup: z.string().max(10).optional().or(z.literal("")),
    personalEmail: z.string().email().optional().or(z.literal("")),
    personalPhone: z.string().max(30).optional().or(z.literal("")),
    bio: z.string().max(1000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (
      data.designationId === DESIGNATION_OTHER_VALUE &&
      !data.customDesignationTitle?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a designation",
        path: ["customDesignationTitle"],
      });
    }
  });

export type EmployeeListParamsInput = z.infer<typeof employeeListParamsSchema>;
export type EmployeeWizardInputValidated = z.infer<typeof employeeWizardSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
