import type {
  BackupConfiguration,
  BrandingConfiguration,
  CompanySettingsBundle,
  IntegrationsConfiguration,
  LeavePoliciesConfiguration,
  NotificationsGlobalConfiguration,
  SecurityConfiguration,
  WorkingConfiguration,
  WorkingDay,
  WeekendDayRule,
} from "@/types/company-settings";

export const DEFAULT_WORKING_CONFIGURATION: WorkingConfiguration = {
  officeWorkingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  officeHours: { start: "10:00", end: "19:00", timezone: "Asia/Kolkata" },
  breakHours: { start: "14:00", end: "15:00" },
  graceTime: { checkIn: "10:05" },
  weekendRules: { saturday: "off", sunday: "off" },
  workWeekStartDay: 1,
  defaultShiftTemplateId: null,
};

export const DEFAULT_LEAVE_POLICIES: LeavePoliciesConfiguration = {
  leaveYearStartMonth: 1,
  minNoticeDays: 1,
  maxConsecutiveDays: 30,
  allowHalfDay: true,
  allowCarryForward: true,
  approvalLevels: 1,
  halfDayRules: {
    enabled: true,
    morningEnd: "13:00",
    afternoonStart: "14:00",
  },
  sandwichLeave: {
    enabled: false,
    includeWeekends: true,
    includeHolidays: true,
  },
  carryForward: {
    enabled: true,
    maxDays: 10,
    expiryMonths: 3,
  },
  encashment: {
    enabled: false,
    maxDaysPerYear: 5,
    minBalanceRequired: 15,
  },
};

export const DEFAULT_NOTIFICATIONS_GLOBAL: NotificationsGlobalConfiguration = {
  emailEnabled: true,
  inAppEnabled: true,
  reminderFrequencyHours: 24,
  digestEnabled: false,
  digestFrequency: "daily",
};

export const DEFAULT_SECURITY_CONFIGURATION: SecurityConfiguration = {
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: false,
    expiryDays: 0,
  },
  sessionTimeoutMinutes: 480,
  maxLoginAttempts: 5,
  lockDurationMinutes: 30,
  mfaEnabled: false,
};

export const DEFAULT_BRANDING_CONFIGURATION: BrandingConfiguration = {
  primaryColor: "#2563eb",
  secondaryColor: "#64748b",
  faviconPath: null,
  loginTitle: "Welcome to iFranchise HRMS",
  loginSubtitle: "Sign in to manage your workforce",
  footerText: "© iFranchise. All rights reserved.",
};

export const DEFAULT_INTEGRATIONS_CONFIGURATION: IntegrationsConfiguration = {
  smtp: {
    host: "",
    port: 587,
    username: "",
    fromEmail: "",
    useTls: true,
    enabled: false,
  },
  googleCalendar: { enabled: false, clientId: "" },
  microsoftOutlook: { enabled: false, tenantId: "" },
  storageProvider: "supabase",
  webhookUrl: "",
  webhookSecret: "",
  apiKeysEnabled: false,
};

export const DEFAULT_BACKUP_CONFIGURATION: BackupConfiguration = {
  backupFrequency: "daily",
  maintenanceMode: false,
  maintenanceMessage: "System is under maintenance. Please try again later.",
  logRetentionDays: 90,
};

function asWorkingDays(value: unknown): WorkingDay[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_WORKING_CONFIGURATION.officeWorkingDays;
  }
  return value.filter((day): day is WorkingDay => typeof day === "string") as WorkingDay[];
}

function asWeekendRule(value: unknown, fallback: WeekendDayRule): WeekendDayRule {
  if (value === "off" || value === "working" || value === "half_day") return value;
  return fallback;
}

export function parseWorkingConfiguration(
  settings: Record<string, unknown> | null | undefined,
  columns?: { workWeekStartDay?: number | null; timezone?: string | null },
): WorkingConfiguration {
  const workingHours = (settings?.working_hours as Record<string, unknown> | undefined) ?? {};
  const lunchBreak = (settings?.lunch_break as Record<string, unknown> | undefined) ?? {};
  const graceTime = (settings?.grace_time as Record<string, unknown> | undefined) ?? {};
  const attendanceRules = (settings?.attendance_rules as Record<string, unknown> | undefined) ?? {};
  const weekendRules = (settings?.weekend_rules as Record<string, unknown> | undefined) ?? {};
  const shiftDefaults = (settings?.shift_defaults as Record<string, unknown> | undefined) ?? {};

  return {
    officeWorkingDays: asWorkingDays(attendanceRules.working_days),
    officeHours: {
      start: typeof workingHours.start === "string" ? workingHours.start : DEFAULT_WORKING_CONFIGURATION.officeHours.start,
      end: typeof workingHours.end === "string" ? workingHours.end : DEFAULT_WORKING_CONFIGURATION.officeHours.end,
      timezone:
        typeof workingHours.timezone === "string"
          ? workingHours.timezone
          : columns?.timezone ?? DEFAULT_WORKING_CONFIGURATION.officeHours.timezone,
    },
    breakHours: {
      start: typeof lunchBreak.start === "string" ? lunchBreak.start : DEFAULT_WORKING_CONFIGURATION.breakHours.start,
      end: typeof lunchBreak.end === "string" ? lunchBreak.end : DEFAULT_WORKING_CONFIGURATION.breakHours.end,
    },
    graceTime: {
      checkIn:
        typeof graceTime.check_in === "string"
          ? graceTime.check_in
          : typeof attendanceRules.late_after === "string"
            ? attendanceRules.late_after
            : DEFAULT_WORKING_CONFIGURATION.graceTime.checkIn,
    },
    weekendRules: {
      saturday: asWeekendRule(weekendRules.saturday, DEFAULT_WORKING_CONFIGURATION.weekendRules.saturday),
      sunday: asWeekendRule(weekendRules.sunday, DEFAULT_WORKING_CONFIGURATION.weekendRules.sunday),
    },
    workWeekStartDay:
      typeof columns?.workWeekStartDay === "number"
        ? columns.workWeekStartDay
        : DEFAULT_WORKING_CONFIGURATION.workWeekStartDay,
    defaultShiftTemplateId:
      typeof shiftDefaults.default_shift_template_id === "string"
        ? shiftDefaults.default_shift_template_id
        : null,
  };
}

export function parseLeavePolicies(
  settings: Record<string, unknown> | null | undefined,
): LeavePoliciesConfiguration {
  const leaveRules = (settings?.leave_rules as Record<string, unknown> | undefined) ?? {};
  const leavePolicies = (settings?.leave_policies as Record<string, unknown> | undefined) ?? {};
  const halfDay = (leavePolicies.half_day_rules as Record<string, unknown> | undefined) ?? {};
  const sandwich = (leavePolicies.sandwich_leave as Record<string, unknown> | undefined) ?? {};
  const carry = (leavePolicies.carry_forward as Record<string, unknown> | undefined) ?? {};
  const encash = (leavePolicies.encashment as Record<string, unknown> | undefined) ?? {};

  return {
    leaveYearStartMonth:
      Number(leavePolicies.leave_year_start_month) ||
      DEFAULT_LEAVE_POLICIES.leaveYearStartMonth,
    minNoticeDays: Number(leaveRules.min_notice_days) || DEFAULT_LEAVE_POLICIES.minNoticeDays,
    maxConsecutiveDays:
      Number(leaveRules.max_consecutive_days) || DEFAULT_LEAVE_POLICIES.maxConsecutiveDays,
    allowHalfDay:
      typeof leaveRules.allow_half_day === "boolean"
        ? leaveRules.allow_half_day
        : DEFAULT_LEAVE_POLICIES.allowHalfDay,
    allowCarryForward:
      typeof leaveRules.allow_carry_forward === "boolean"
        ? leaveRules.allow_carry_forward
        : DEFAULT_LEAVE_POLICIES.allowCarryForward,
    approvalLevels: Number(leaveRules.approval_levels) || DEFAULT_LEAVE_POLICIES.approvalLevels,
    halfDayRules: {
      enabled:
        typeof halfDay.enabled === "boolean" ? halfDay.enabled : DEFAULT_LEAVE_POLICIES.halfDayRules.enabled,
      morningEnd:
        typeof halfDay.morning_end === "string"
          ? halfDay.morning_end
          : DEFAULT_LEAVE_POLICIES.halfDayRules.morningEnd,
      afternoonStart:
        typeof halfDay.afternoon_start === "string"
          ? halfDay.afternoon_start
          : DEFAULT_LEAVE_POLICIES.halfDayRules.afternoonStart,
    },
    sandwichLeave: {
      enabled:
        typeof sandwich.enabled === "boolean"
          ? sandwich.enabled
          : DEFAULT_LEAVE_POLICIES.sandwichLeave.enabled,
      includeWeekends:
        typeof sandwich.include_weekends === "boolean"
          ? sandwich.include_weekends
          : DEFAULT_LEAVE_POLICIES.sandwichLeave.includeWeekends,
      includeHolidays:
        typeof sandwich.include_holidays === "boolean"
          ? sandwich.include_holidays
          : DEFAULT_LEAVE_POLICIES.sandwichLeave.includeHolidays,
    },
    carryForward: {
      enabled:
        typeof carry.enabled === "boolean" ? carry.enabled : DEFAULT_LEAVE_POLICIES.carryForward.enabled,
      maxDays: Number(carry.max_days) || DEFAULT_LEAVE_POLICIES.carryForward.maxDays,
      expiryMonths:
        Number(carry.expiry_months) || DEFAULT_LEAVE_POLICIES.carryForward.expiryMonths,
    },
    encashment: {
      enabled:
        typeof encash.enabled === "boolean" ? encash.enabled : DEFAULT_LEAVE_POLICIES.encashment.enabled,
      maxDaysPerYear:
        Number(encash.max_days_per_year) || DEFAULT_LEAVE_POLICIES.encashment.maxDaysPerYear,
      minBalanceRequired:
        Number(encash.min_balance_required) || DEFAULT_LEAVE_POLICIES.encashment.minBalanceRequired,
    },
  };
}

function mapBool(obj: Record<string, unknown> | undefined, key: string, fallback: boolean) {
  return typeof obj?.[key] === "boolean" ? (obj[key] as boolean) : fallback;
}

export function parseNotificationsGlobal(
  settings: Record<string, unknown> | null | undefined,
): NotificationsGlobalConfiguration {
  const raw = (settings?.notifications_global as Record<string, unknown> | undefined) ?? {};
  return {
    emailEnabled: mapBool(raw, "email_enabled", DEFAULT_NOTIFICATIONS_GLOBAL.emailEnabled),
    inAppEnabled: mapBool(raw, "in_app_enabled", DEFAULT_NOTIFICATIONS_GLOBAL.inAppEnabled),
    reminderFrequencyHours:
      Number(raw.reminder_frequency_hours) || DEFAULT_NOTIFICATIONS_GLOBAL.reminderFrequencyHours,
    digestEnabled: mapBool(raw, "digest_enabled", DEFAULT_NOTIFICATIONS_GLOBAL.digestEnabled),
    digestFrequency:
      raw.digest_frequency === "weekly" ? "weekly" : DEFAULT_NOTIFICATIONS_GLOBAL.digestFrequency,
  };
}

export function parseSecurityConfiguration(
  settings: Record<string, unknown> | null | undefined,
): SecurityConfiguration {
  const raw = (settings?.security as Record<string, unknown> | undefined) ?? {};
  const policy = (raw.password_policy as Record<string, unknown> | undefined) ?? {};
  return {
    passwordPolicy: {
      minLength: Number(policy.min_length) || DEFAULT_SECURITY_CONFIGURATION.passwordPolicy.minLength,
      requireUppercase: mapBool(policy, "require_uppercase", DEFAULT_SECURITY_CONFIGURATION.passwordPolicy.requireUppercase),
      requireLowercase: mapBool(policy, "require_lowercase", DEFAULT_SECURITY_CONFIGURATION.passwordPolicy.requireLowercase),
      requireNumber: mapBool(policy, "require_number", DEFAULT_SECURITY_CONFIGURATION.passwordPolicy.requireNumber),
      requireSpecial: mapBool(policy, "require_special", DEFAULT_SECURITY_CONFIGURATION.passwordPolicy.requireSpecial),
      expiryDays: Number(policy.expiry_days) || 0,
    },
    sessionTimeoutMinutes:
      Number(raw.session_timeout_minutes) || DEFAULT_SECURITY_CONFIGURATION.sessionTimeoutMinutes,
    maxLoginAttempts: Number(raw.max_login_attempts) || DEFAULT_SECURITY_CONFIGURATION.maxLoginAttempts,
    lockDurationMinutes:
      Number(raw.lock_duration_minutes) || DEFAULT_SECURITY_CONFIGURATION.lockDurationMinutes,
    mfaEnabled: mapBool(raw, "mfa_enabled", DEFAULT_SECURITY_CONFIGURATION.mfaEnabled),
  };
}

export function parseBrandingConfiguration(
  settings: Record<string, unknown> | null | undefined,
): BrandingConfiguration {
  const raw = (settings?.branding as Record<string, unknown> | undefined) ?? {};
  return {
    primaryColor:
      typeof raw.primary_color === "string"
        ? raw.primary_color
        : DEFAULT_BRANDING_CONFIGURATION.primaryColor,
    secondaryColor:
      typeof raw.secondary_color === "string"
        ? raw.secondary_color
        : DEFAULT_BRANDING_CONFIGURATION.secondaryColor,
    faviconPath:
      typeof raw.favicon_path === "string" ? raw.favicon_path : DEFAULT_BRANDING_CONFIGURATION.faviconPath,
    loginTitle:
      typeof raw.login_title === "string"
        ? raw.login_title
        : DEFAULT_BRANDING_CONFIGURATION.loginTitle,
    loginSubtitle:
      typeof raw.login_subtitle === "string"
        ? raw.login_subtitle
        : DEFAULT_BRANDING_CONFIGURATION.loginSubtitle,
    footerText:
      typeof raw.footer_text === "string" ? raw.footer_text : DEFAULT_BRANDING_CONFIGURATION.footerText,
  };
}

export function parseIntegrationsConfiguration(
  settings: Record<string, unknown> | null | undefined,
): IntegrationsConfiguration {
  const raw = (settings?.integrations as Record<string, unknown> | undefined) ?? {};
  const smtp = (raw.smtp as Record<string, unknown> | undefined) ?? {};
  const google = (raw.google_calendar as Record<string, unknown> | undefined) ?? {};
  const outlook = (raw.microsoft_outlook as Record<string, unknown> | undefined) ?? {};
  return {
    smtp: {
      host: typeof smtp.host === "string" ? smtp.host : "",
      port: Number(smtp.port) || DEFAULT_INTEGRATIONS_CONFIGURATION.smtp.port,
      username: typeof smtp.username === "string" ? smtp.username : "",
      fromEmail: typeof smtp.from_email === "string" ? smtp.from_email : "",
      useTls: mapBool(smtp, "use_tls", true),
      enabled: mapBool(smtp, "enabled", false),
    },
    googleCalendar: {
      enabled: mapBool(google, "enabled", false),
      clientId: typeof google.client_id === "string" ? google.client_id : "",
    },
    microsoftOutlook: {
      enabled: mapBool(outlook, "enabled", false),
      tenantId: typeof outlook.tenant_id === "string" ? outlook.tenant_id : "",
    },
    storageProvider:
      raw.storage_provider === "s3" || raw.storage_provider === "azure"
        ? raw.storage_provider
        : "supabase",
    webhookUrl: typeof raw.webhook_url === "string" ? raw.webhook_url : "",
    webhookSecret: typeof raw.webhook_secret === "string" ? raw.webhook_secret : "",
    apiKeysEnabled: mapBool(raw, "api_keys_enabled", false),
  };
}

export function parseBackupConfiguration(
  settings: Record<string, unknown> | null | undefined,
): BackupConfiguration {
  const raw = (settings?.backup as Record<string, unknown> | undefined) ?? {};
  const frequency = raw.backup_frequency;
  return {
    backupFrequency:
      frequency === "hourly" || frequency === "weekly" ? frequency : DEFAULT_BACKUP_CONFIGURATION.backupFrequency,
    maintenanceMode: mapBool(raw, "maintenance_mode", false),
    maintenanceMessage:
      typeof raw.maintenance_message === "string"
        ? raw.maintenance_message
        : DEFAULT_BACKUP_CONFIGURATION.maintenanceMessage,
    logRetentionDays: Number(raw.log_retention_days) || DEFAULT_BACKUP_CONFIGURATION.logRetentionDays,
  };
}

export function toStoredWorkingConfiguration(working: WorkingConfiguration) {
  return {
    working_hours: {
      start: working.officeHours.start,
      end: working.officeHours.end,
      timezone: working.officeHours.timezone,
    },
    lunch_break: {
      start: working.breakHours.start,
      end: working.breakHours.end,
    },
    grace_time: { check_in: working.graceTime.checkIn },
    attendance_rules: {
      working_days: working.officeWorkingDays,
      late_after: working.graceTime.checkIn,
      require_check_out: true,
      allow_remote_check_in: false,
      half_day_minimum_hours: 4,
      full_day_minimum_hours: 8,
    },
    weekend_rules: {
      saturday: working.weekendRules.saturday,
      sunday: working.weekendRules.sunday,
    },
    shift_defaults: {
      default_shift_template_id: working.defaultShiftTemplateId,
    },
  };
}

export function toStoredLeavePolicies(leave: LeavePoliciesConfiguration) {
  return {
    leave_rules: {
      min_notice_days: leave.minNoticeDays,
      max_consecutive_days: leave.maxConsecutiveDays,
      allow_half_day: leave.allowHalfDay,
      allow_carry_forward: leave.allowCarryForward,
      approval_levels: leave.approvalLevels,
    },
    leave_policies: {
      leave_year_start_month: leave.leaveYearStartMonth,
      half_day_rules: {
        enabled: leave.halfDayRules.enabled,
        morning_end: leave.halfDayRules.morningEnd,
        afternoon_start: leave.halfDayRules.afternoonStart,
      },
      sandwich_leave: {
        enabled: leave.sandwichLeave.enabled,
        include_weekends: leave.sandwichLeave.includeWeekends,
        include_holidays: leave.sandwichLeave.includeHolidays,
      },
      carry_forward: {
        enabled: leave.carryForward.enabled,
        max_days: leave.carryForward.maxDays,
        expiry_months: leave.carryForward.expiryMonths,
      },
      encashment: {
        enabled: leave.encashment.enabled,
        max_days_per_year: leave.encashment.maxDaysPerYear,
        min_balance_required: leave.encashment.minBalanceRequired,
      },
    },
  };
}

export function toStoredNotificationsGlobal(notifications: NotificationsGlobalConfiguration) {
  return {
    email_enabled: notifications.emailEnabled,
    in_app_enabled: notifications.inAppEnabled,
    reminder_frequency_hours: notifications.reminderFrequencyHours,
    digest_enabled: notifications.digestEnabled,
    digest_frequency: notifications.digestFrequency,
  };
}

export function toStoredSecurityConfiguration(security: SecurityConfiguration) {
  return {
    password_policy: {
      min_length: security.passwordPolicy.minLength,
      require_uppercase: security.passwordPolicy.requireUppercase,
      require_lowercase: security.passwordPolicy.requireLowercase,
      require_number: security.passwordPolicy.requireNumber,
      require_special: security.passwordPolicy.requireSpecial,
      expiry_days: security.passwordPolicy.expiryDays,
    },
    session_timeout_minutes: security.sessionTimeoutMinutes,
    max_login_attempts: security.maxLoginAttempts,
    lock_duration_minutes: security.lockDurationMinutes,
    mfa_enabled: security.mfaEnabled,
  };
}

export function toStoredBrandingConfiguration(branding: BrandingConfiguration) {
  return {
    primary_color: branding.primaryColor,
    secondary_color: branding.secondaryColor,
    favicon_path: branding.faviconPath,
    login_title: branding.loginTitle,
    login_subtitle: branding.loginSubtitle,
    footer_text: branding.footerText,
  };
}

export function toStoredIntegrationsConfiguration(integrations: IntegrationsConfiguration) {
  return {
    smtp: {
      host: integrations.smtp.host,
      port: integrations.smtp.port,
      username: integrations.smtp.username,
      from_email: integrations.smtp.fromEmail,
      use_tls: integrations.smtp.useTls,
      enabled: integrations.smtp.enabled,
    },
    google_calendar: {
      enabled: integrations.googleCalendar.enabled,
      client_id: integrations.googleCalendar.clientId,
    },
    microsoft_outlook: {
      enabled: integrations.microsoftOutlook.enabled,
      tenant_id: integrations.microsoftOutlook.tenantId,
    },
    storage_provider: integrations.storageProvider,
    webhook_url: integrations.webhookUrl,
    webhook_secret: integrations.webhookSecret,
    api_keys_enabled: integrations.apiKeysEnabled,
  };
}

export function toStoredBackupConfiguration(backup: BackupConfiguration) {
  return {
    backup_frequency: backup.backupFrequency,
    maintenance_mode: backup.maintenanceMode,
    maintenance_message: backup.maintenanceMessage,
    log_retention_days: backup.logRetentionDays,
  };
}

export type CompanySettingsSectionData = Pick<
  CompanySettingsBundle,
  | "working"
  | "leave"
  | "notifications"
  | "security"
  | "branding"
  | "integrations"
  | "backup"
>;
