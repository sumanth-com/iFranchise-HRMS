import { z } from "zod";

import { CEO_NOTIFICATION_CATEGORIES } from "@/lib/ceo/ceo-notification-categories";

const categorySchema = z.enum(
  CEO_NOTIFICATION_CATEGORIES as unknown as [
    (typeof CEO_NOTIFICATION_CATEGORIES)[number],
    ...(typeof CEO_NOTIFICATION_CATEGORIES)[number][],
  ],
);

export const ceoNotificationsListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
  category: categorySchema.optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["unread", "read", "archived"]).optional(),
  departmentId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});

export const ceoNotificationIdSchema = z.object({
  notificationId: z.string().uuid(),
});

export const ceoNotificationNavigateSchema = z.object({
  notificationId: z.string().uuid(),
  href: z.string().min(1).max(500),
});
