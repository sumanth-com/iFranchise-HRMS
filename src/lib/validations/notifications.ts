import { z } from "zod";

const notificationModuleSchema = z.enum([
  "system",
  "attendance",
  "leave",
  "payroll",
  "recruitment",
  "performance",
  "documents",
  "assets",
  "exit",
  "reports",
  "security",
]);

const notificationPrioritySchema = z.enum(["low", "medium", "high", "critical"]);

const notificationStatusSchema = z.enum(["unread", "read", "archived"]);

export const notificationListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  tab: z.enum(["all", "unread", "read", "archived"]).default("all"),
  search: z.string().optional(),
});

export const notificationHistoryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  employeeId: z.string().uuid().optional(),
  module: notificationModuleSchema.optional(),
  type: z.string().optional(),
  priority: notificationPrioritySchema.optional(),
  status: notificationStatusSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});

export const notificationTemplateFormSchema = z.object({
  templateKey: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  module: notificationModuleSchema,
  subject: z.string().min(1).max(500),
  bodyTemplate: z.string().min(1).max(5000),
  variables: z.array(z.string()).default([]),
});

export const notificationSettingsFormSchema = z.object({
  typeSettings: z.record(
    notificationModuleSchema,
    z.object({
      inApp: z.boolean(),
      email: z.boolean(),
      push: z.boolean(),
    }),
  ),
});

export const notificationPreferencesFormSchema = z.object({
  receiveEmail: z.boolean(),
  receiveInApp: z.boolean(),
  muteNotifications: z.boolean(),
  dailyDigest: z.boolean(),
  weeklyDigest: z.boolean(),
});

export const notificationPreviewSchema = z.object({
  subject: z.string(),
  bodyTemplate: z.string(),
  variables: z.record(z.string(), z.string()).default({}),
});

export type NotificationListParams = z.infer<typeof notificationListParamsSchema>;
export type NotificationHistoryParamsInput = z.infer<typeof notificationHistoryParamsSchema>;
export type NotificationTemplateFormInput = z.infer<typeof notificationTemplateFormSchema>;
export type NotificationSettingsFormInput = z.infer<typeof notificationSettingsFormSchema>;
export type NotificationPreferencesFormInput = z.infer<typeof notificationPreferencesFormSchema>;
