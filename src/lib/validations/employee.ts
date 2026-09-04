import { z } from "zod";

import { DESIGNATION_OTHER_VALUE } from "@/lib/employees/constants";
import { optionalPastOrTodayDateSchema } from "@/lib/validations/date";
import {
  optionalPhoneSchema,
  requiredPhoneSchema,
} from "@/lib/validations/phone";
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
  "invitation_accepted",
  "active",
  "inactive",
  "suspended",
  "archived",
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
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
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
    .default("first_name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  department: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .optional(),
  employmentStatus: employmentStatusSchema.optional(),
  accountStatus: employeeAccountStatusSchema.optional(),
  employmentCategory: z.enum(["all", "probation", "full_time"]).optional(),
});

export const changeEmploymentTypeSchema = z.object({
  employeeId: z.string().uuid(),
  employmentTypeId: z.string().uuid(),
});

export const employeeInviteSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Employee name must be at least 2 characters")
    .max(100, "Employee name must be 100 characters or fewer"),
  email: z.string().trim().email("Enter a valid company email"),
  roleId: z.string().uuid("Select a role"),
  departmentId: z.string().uuid("Select a department"),
  branchId: z.string().uuid("Select a branch"),
  designation: z
    .string()
    .trim()
    .min(1, "Enter a designation")
    .max(100, "Designation must be 100 characters or fewer"),
  employmentTypeId: z.string().uuid("Select an employment type"),
  reportingManagerId: z.string().uuid("Select a reporting manager"),
});

export type EmployeeInviteInput = z.infer<typeof employeeInviteSchema>;

/** Preferences-only fallback when contact self-edit is not allowed. */
export const employeeSelfPreferencesSchema = z.object({
  language: z.string().min(2).max(20),
  timezone: z.string().min(1).max(80),
});

export type EmployeeSelfPreferencesInput = z.infer<typeof employeeSelfPreferencesSchema>;

export const employeeSelfProfileSchema = z.object({
  personalEmail: z.string().email().optional().or(z.literal("")),
  personalPhone: requiredPhoneSchema,
  language: z.string().min(2, "Language is required").max(20),
  timezone: z.string().min(1, "Timezone is required").max(80),
  gender: genderTypeSchema,
  addressLine1: z
    .string()
    .trim()
    .min(1, "Address line 1 is required")
    .max(200),
  addressLine2: z
    .string()
    .trim()
    .min(1, "Address line 2 is required")
    .max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(100),
  postalCode: z.string().trim().min(1, "Postal code is required").max(20),
  country: z.string().trim().min(1, "Country is required").max(100),
  emergencyContactName: z
    .string()
    .trim()
    .min(1, "Emergency contact name is required")
    .max(100),
  emergencyContactRelationship: z
    .string()
    .trim()
    .min(1, "Emergency relationship is required")
    .max(100),
  emergencyContactPhone: requiredPhoneSchema,
  emergencyContactEmail: z
    .string()
    .trim()
    .min(1, "Emergency email is required")
    .email("Enter a valid emergency email"),
  reportingManagerId: z.string().uuid().optional().or(z.literal("")),
});

export type EmployeeSelfProfileInput = z.infer<typeof employeeSelfProfileSchema>;

/** Validates only language/timezone when contact self-edit is disabled. */
export const employeeSelfProfilePreferencesOnlySchema = employeeSelfProfileSchema
  .partial()
  .required({ language: true, timezone: true });

export const employeeBasicStepSchema = z.object({
  employeeCode: z
    .string()
    .min(1, "Employee code is required")
    .max(50, "Employee code is too long"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Enter a valid email address"),
  phone: optionalPhoneSchema,
  dateOfBirth: optionalPastOrTodayDateSchema,
  gender: genderTypeSchema,
  maritalStatus: maritalStatusSchema.optional(),
  nationality: z.string().max(100).optional(),
  bloodGroup: z.string().max(10).optional(),
  personalEmail: z.string().email().optional().or(z.literal("")),
  personalPhone: optionalPhoneSchema,
  bio: z.string().max(1000).optional(),
});

export const employeeEmploymentStepSchema = z
  .object({
    branchId: z.string().uuid("Select a branch"),
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
    assignedHrEmployeeId: z.string().uuid().optional().or(z.literal("")),
    employmentStatus: employmentStatusSchema,
    dateOfJoining: z.string().optional(),
    dateOfLeaving: z.string().optional(),
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
  phone: requiredPhoneSchema,
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
    phone: optionalPhoneSchema,
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
    assignedHrEmployeeId: z.string().uuid().optional().or(z.literal("")),
    employmentStatus: employmentStatusSchema,
    dateOfJoining: z.string().optional().or(z.literal("")),
    dateOfLeaving: z.string().optional().or(z.literal("")),
    dateOfBirth: optionalPastOrTodayDateSchema,
    gender: genderTypeSchema,
    maritalStatus: maritalStatusSchema.optional(),
    nationality: z.string().max(100).optional().or(z.literal("")),
    bloodGroup: z.string().max(10).optional().or(z.literal("")),
    personalEmail: z.string().email().optional().or(z.literal("")),
    personalPhone: optionalPhoneSchema,
    bio: z.string().max(1000).optional().or(z.literal("")),
    addressLine1: z.string().max(200).optional().or(z.literal("")),
    addressLine2: z.string().max(200).optional().or(z.literal("")),
    city: z.string().max(100).optional().or(z.literal("")),
    state: z.string().max(100).optional().or(z.literal("")),
    postalCode: z.string().max(20).optional().or(z.literal("")),
    country: z.string().max(100).optional().or(z.literal("")),
    emergencyContactName: z.string().max(100).optional().or(z.literal("")),
    emergencyContactRelationship: z.string().max(100).optional().or(z.literal("")),
    emergencyContactPhone: optionalPhoneSchema,
    emergencyContactEmail: z.string().email().optional().or(z.literal("")),
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
