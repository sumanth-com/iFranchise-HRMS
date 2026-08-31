import { z } from "zod";

import { DASHBOARD_ANNOUNCEMENT_ICON_KEYS } from "@/types/dashboard-announcement";

export const dashboardAnnouncementPrioritySchema = z.enum(["normal", "important"]);

export const dashboardAnnouncementIconKeySchema = z.enum(DASHBOARD_ANNOUNCEMENT_ICON_KEYS);

export const saveDashboardAnnouncementSchema = z.object({
  id: z.string().uuid().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Title must be 120 characters or fewer"),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(500, "Message must be 500 characters or fewer"),
  iconKey: dashboardAnnouncementIconKeySchema.nullable().optional(),
  priority: dashboardAnnouncementPrioritySchema.default("normal"),
  isPublished: z.boolean().default(false),
  clearImage: z.boolean().optional(),
});

export type SaveDashboardAnnouncementInput = z.infer<
  typeof saveDashboardAnnouncementSchema
>;
