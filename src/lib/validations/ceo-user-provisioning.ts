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

export const ceoProvisioningEmployeeIdSchema = z.object({
  employeeId: z.string().uuid(),
});

export type InviteExecutiveUserInput = z.infer<typeof inviteExecutiveUserSchema>;
export type CeoProvisioningListParamsInput = z.infer<
  typeof ceoProvisioningListParamsSchema
>;
