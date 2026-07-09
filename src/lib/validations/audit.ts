import { z } from "zod";

const auditPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
const auditEventStatusSchema = z.enum(["success", "failed"]);

export const auditListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  userId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  module: z.string().optional(),
  action: z.string().optional(),
  status: auditEventStatusSchema.optional(),
  priority: auditPrioritySchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const auditSettingsFormSchema = z.object({
  retentionDays: z.coerce.number().int().min(30).max(3650),
});

export const applicationAuditSchema = z.object({
  organizationId: z.string().uuid().nullable(),
  module: z.string(),
  action: z.string(),
  description: z.string(),
  recordId: z.string().optional(),
  eventStatus: auditEventStatusSchema.default("success"),
  priority: auditPrioritySchema.default("medium"),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  deviceType: z.string().optional(),
  browser: z.string().optional(),
  operatingSystem: z.string().optional(),
  reason: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AuditListParams = z.infer<typeof auditListParamsSchema>;
export type AuditSettingsFormInput = z.infer<typeof auditSettingsFormSchema>;
