import { z } from "zod";

import { paginationSchema } from "@/lib/validations/common";
import { PROVISIONABLE_ROLE_CODES } from "@/types/ceo-user-provisioning";

export const provisionableRoleSchema = z.enum(PROVISIONABLE_ROLE_CODES);

export const invitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "expired",
  "cancelled",
  "revoked",
  "inactive",
]);

export const ceoProvisioningListParamsSchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  roleCode: z.string().trim().optional(),
  departmentId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  invitationStatus: invitationStatusSchema.optional(),
});

export const inviteExecutiveUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  roleCode: z
    .string()
    .trim()
    .min(1, "Select or enter a role")
    .refine(
      (value) => value.toLowerCase() !== "employee",
      "CEO cannot invite Employees. Employees are managed by HR.",
    ),
  departmentId: z.string().uuid("Select a department"),
  designationId: z.string().uuid("Select a designation"),
  branchId: z.string().uuid().optional(),
  reportingToId: z.string().uuid().optional(),
  employmentTypeId: z.string().uuid().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const ceoProvisioningEmployeeIdSchema = z.object({
  employeeId: z.string().uuid(),
});

export type InviteExecutiveUserInput = z.infer<typeof inviteExecutiveUserSchema>;
export type CeoProvisioningListParamsInput = z.infer<
  typeof ceoProvisioningListParamsSchema
>;
