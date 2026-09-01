import { z } from "zod";

import {
  COMPANY_ANNOUNCEMENT_AUDIENCES,
  COMPANY_ANNOUNCEMENT_CATEGORIES,
  COMPANY_ANNOUNCEMENT_ICON_KEYS,
  COMPANY_ANNOUNCEMENT_PRIORITIES,
} from "@/types/company-announcement";

export const companyAnnouncementFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1, "Title is required").max(180),
    shortDescription: z.string().trim().max(280).optional().or(z.literal("")),
    content: z.string().trim().min(1, "Announcement content is required"),
    category: z.enum(COMPANY_ANNOUNCEMENT_CATEGORIES),
    priority: z.enum(COMPANY_ANNOUNCEMENT_PRIORITIES),
    requiresAcknowledgement: z.boolean(),
    audienceType: z.enum(COMPANY_ANNOUNCEMENT_AUDIENCES),
    iconKey: z.enum(COMPANY_ANNOUNCEMENT_ICON_KEYS).default("megaphone"),
    departmentIds: z.array(z.string().uuid()).default([]),
    employeeIds: z.array(z.string().uuid()).default([]),
    publishAt: z.string().min(1, "Publish date is required"),
    expiresAt: z.string().optional().or(z.literal("")),
    publishNow: z.boolean().optional(),
    removeAttachmentIds: z.array(z.string().uuid()).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.audienceType === "department" && value.departmentIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["departmentIds"],
        message: "Select at least one department",
      });
    }
    if (value.audienceType === "employees" && value.employeeIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["employeeIds"],
        message: "Select at least one employee",
      });
    }
    if (value.expiresAt && value.publishAt && value.expiresAt < value.publishAt) {
      ctx.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Expiry must be on or after the publish date",
      });
    }
  });

export type CompanyAnnouncementFormInput = z.infer<typeof companyAnnouncementFormSchema>;
