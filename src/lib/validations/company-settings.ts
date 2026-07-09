import { z } from "zod";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format");
const workingDaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
const weekendRuleSchema = z.enum(["off", "working", "half_day"]);

export const companySettingsSectionSchema = z.enum([
  "profile",
  "working",
  "leave",
  "payroll",
  "recruitment",
  "performance",
  "notifications",
  "security",
  "branding",
  "integrations",
  "backup",
]);

export const workingConfigurationSchema = z.object({
  officeWorkingDays: z.array(workingDaySchema).min(1, "Select at least one working day"),
  officeHours: z.object({
    start: timeSchema,
    end: timeSchema,
    timezone: z.string().min(1),
  }),
  breakHours: z.object({
    start: timeSchema,
    end: timeSchema,
  }),
  graceTime: z.object({
    checkIn: timeSchema,
  }),
  weekendRules: z.object({
    saturday: weekendRuleSchema,
    sunday: weekendRuleSchema,
  }),
  workWeekStartDay: z.coerce.number().int().min(0).max(6),
  defaultShiftTemplateId: z.string().uuid().nullable().default(null),
});

export const leavePoliciesSchema = z.object({
  leaveYearStartMonth: z.coerce.number().int().min(1).max(12),
  minNoticeDays: z.coerce.number().int().min(0).max(90),
  maxConsecutiveDays: z.coerce.number().int().min(1).max(365),
  allowHalfDay: z.boolean(),
  allowCarryForward: z.boolean(),
  approvalLevels: z.coerce.number().int().min(1).max(5),
  halfDayRules: z.object({
    enabled: z.boolean(),
    morningEnd: timeSchema,
    afternoonStart: timeSchema,
  }),
  sandwichLeave: z.object({
    enabled: z.boolean(),
    includeWeekends: z.boolean(),
    includeHolidays: z.boolean(),
  }),
  carryForward: z.object({
    enabled: z.boolean(),
    maxDays: z.coerce.number().int().min(0).max(365),
    expiryMonths: z.coerce.number().int().min(1).max(24),
  }),
  encashment: z.object({
    enabled: z.boolean(),
    maxDaysPerYear: z.coerce.number().int().min(0).max(60),
    minBalanceRequired: z.coerce.number().int().min(0).max(365),
  }),
});

export const notificationsGlobalSchema = z.object({
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  reminderFrequencyHours: z.coerce.number().int().min(1).max(168),
  digestEnabled: z.boolean(),
  digestFrequency: z.enum(["daily", "weekly"]),
});

export const securityConfigurationSchema = z.object({
  passwordPolicy: z.object({
    minLength: z.coerce.number().int().min(6).max(128),
    requireUppercase: z.boolean(),
    requireLowercase: z.boolean(),
    requireNumber: z.boolean(),
    requireSpecial: z.boolean(),
    expiryDays: z.coerce.number().int().min(0).max(365),
  }),
  sessionTimeoutMinutes: z.coerce.number().int().min(15).max(1440),
  maxLoginAttempts: z.coerce.number().int().min(3).max(20),
  lockDurationMinutes: z.coerce.number().int().min(5).max(1440),
  mfaEnabled: z.boolean(),
});

export const brandingConfigurationSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid hex color"),
  faviconPath: z.string().nullable().default(null),
  loginTitle: z.string().min(1).max(200),
  loginSubtitle: z.string().max(500),
  footerText: z.string().max(500),
});

export const integrationsConfigurationSchema = z.object({
  smtp: z.object({
    host: z.string().max(255),
    port: z.coerce.number().int().min(1).max(65535),
    username: z.string().max(255),
    fromEmail: z.string().email().or(z.literal("")),
    useTls: z.boolean(),
    enabled: z.boolean(),
  }),
  googleCalendar: z.object({
    enabled: z.boolean(),
    clientId: z.string().max(500),
  }),
  microsoftOutlook: z.object({
    enabled: z.boolean(),
    tenantId: z.string().max(500),
  }),
  storageProvider: z.enum(["supabase", "s3", "azure"]),
  webhookUrl: z.string().url().or(z.literal("")),
  webhookSecret: z.string().max(500),
  apiKeysEnabled: z.boolean(),
});

export const backupConfigurationSchema = z.object({
  backupFrequency: z.enum(["hourly", "daily", "weekly"]),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().min(1).max(500),
  logRetentionDays: z.coerce.number().int().min(7).max(3650),
});

export type WorkingConfigurationInput = z.input<typeof workingConfigurationSchema>;
export type WorkingConfigurationValues = z.output<typeof workingConfigurationSchema>;
export type LeavePoliciesInput = z.input<typeof leavePoliciesSchema>;
export type LeavePoliciesValues = z.output<typeof leavePoliciesSchema>;
export type NotificationsGlobalInput = z.input<typeof notificationsGlobalSchema>;
export type NotificationsGlobalValues = z.output<typeof notificationsGlobalSchema>;
export type SecurityConfigurationInput = z.input<typeof securityConfigurationSchema>;
export type SecurityConfigurationValues = z.output<typeof securityConfigurationSchema>;
export type BrandingConfigurationInput = z.input<typeof brandingConfigurationSchema>;
export type BrandingConfigurationValues = z.output<typeof brandingConfigurationSchema>;
export type IntegrationsConfigurationInput = z.input<typeof integrationsConfigurationSchema>;
export type IntegrationsConfigurationValues = z.output<typeof integrationsConfigurationSchema>;
export type BackupConfigurationInput = z.input<typeof backupConfigurationSchema>;
export type BackupConfigurationValues = z.output<typeof backupConfigurationSchema>;
