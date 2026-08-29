import { z } from "zod";

import { paginationSchema } from "@/lib/validations/common";

export const invitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "expired",
  "cancelled",
  "revoked",
  "inactive",
  "deactivated",
]);

export const ceoProvisioningListParamsSchema = paginationSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(9),
  search: z.string().trim().max(200).optional(),
  roleCode: z.string().trim().optional(),
  departmentId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  portalKey: z.enum(["hr", "ceo", "manager", "employee"]).optional(),
  employmentTypeId: z.string().uuid().optional(),
  invitationStatus: invitationStatusSchema.optional(),
});

export const inviteExecutiveUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be 100 characters or fewer"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  roleCode: z.string().trim().min(1, "Select a role"),
  departmentId: z.string().uuid("Select a department"),
  designation: z
    .string()
    .trim()
    .min(1, "Designation is required")
    .max(120, "Designation must be 120 characters or fewer"),
  employmentTypeId: z.string().uuid("Select an employment type"),
});

export const inviteExistingEmployeeSchema = z.object({
  employeeId: z.string().uuid("Select an employee"),
  roleCode: z.string().trim().min(1, "Select a role"),
  companyEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid company email")
    .optional(),
  salaryEffectiveFrom: z.string().min(1, "Salary effective date is required"),
  currencyCode: z.string().length(3).default("INR"),
  basicSalary: z.coerce.number().positive("Basic salary must be greater than zero"),
  hraAmount: z.coerce.number().min(0).default(0),
  transportAllowance: z.coerce.number().min(0).default(0),
  otherAllowances: z.coerce.number().min(0).default(0),
});

export const updatePendingProvisioningUserSchema = z.object({
  employeeId: z.string().uuid(),
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(80, "First name must be 80 characters or fewer"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(80, "Last name must be 80 characters or fewer"),
  departmentId: z.string().uuid("Select a department").optional().nullable(),
  designation: z
    .string()
    .trim()
    .min(1, "Designation is required")
    .max(120, "Designation must be 120 characters or fewer")
    .optional()
    .or(z.literal("")),
  employmentTypeId: z.string().uuid("Select an employment type").optional().nullable(),
  reportingManagerId: z.string().uuid("Select a manager").optional().nullable(),
  assignedHrEmployeeId: z.string().uuid("Select an HR contact").optional().nullable(),
});

export const changeProvisioningRoleSchema = z.object({
  employeeId: z.string().uuid(),
  roleCode: z.string().trim().min(1, "Select a role"),
});

export const ceoProvisioningEmployeeIdSchema = z.object({
  employeeId: z.string().uuid(),
});

export type InviteExecutiveUserInput = z.infer<typeof inviteExecutiveUserSchema>;
export type InviteExistingEmployeeInput = z.infer<typeof inviteExistingEmployeeSchema>;
export type UpdatePendingProvisioningUserInput = z.infer<
  typeof updatePendingProvisioningUserSchema
>;
export type ChangeProvisioningRoleInput = z.infer<typeof changeProvisioningRoleSchema>;
export type CeoProvisioningListParamsInput = z.infer<
  typeof ceoProvisioningListParamsSchema
>;
