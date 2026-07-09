import type { OrganizationProfile } from "@/types/organization";
import type { PayrollSettingsRecord } from "@/types/payroll-settings";
import type { PerformanceSettingsRecord } from "@/types/performance";
import type { RecruitmentSettings } from "@/types/recruitment";

export type CompanySettingsSection =
  | "profile"
  | "working"
  | "leave"
  | "payroll"
  | "recruitment"
  | "performance"
  | "notifications"
  | "security"
  | "branding"
  | "integrations"
  | "backup";

export type WorkingDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type WeekendDayRule = "off" | "working" | "half_day";

export type WorkingConfiguration = {
  officeWorkingDays: WorkingDay[];
  officeHours: { start: string; end: string; timezone: string };
  breakHours: { start: string; end: string };
  graceTime: { checkIn: string };
  weekendRules: { saturday: WeekendDayRule; sunday: WeekendDayRule };
  workWeekStartDay: number;
  defaultShiftTemplateId: string | null;
};

export type LeavePoliciesConfiguration = {
  leaveYearStartMonth: number;
  minNoticeDays: number;
  maxConsecutiveDays: number;
  allowHalfDay: boolean;
  allowCarryForward: boolean;
  approvalLevels: number;
  halfDayRules: {
    enabled: boolean;
    morningEnd: string;
    afternoonStart: string;
  };
  sandwichLeave: {
    enabled: boolean;
    includeWeekends: boolean;
    includeHolidays: boolean;
  };
  carryForward: {
    enabled: boolean;
    maxDays: number;
    expiryMonths: number;
  };
  encashment: {
    enabled: boolean;
    maxDaysPerYear: number;
    minBalanceRequired: number;
  };
};

export type NotificationsGlobalConfiguration = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  reminderFrequencyHours: number;
  digestEnabled: boolean;
  digestFrequency: "daily" | "weekly";
};

export type SecurityConfiguration = {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
    expiryDays: number;
  };
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockDurationMinutes: number;
  mfaEnabled: boolean;
};

export type BrandingConfiguration = {
  primaryColor: string;
  secondaryColor: string;
  faviconPath: string | null;
  loginTitle: string;
  loginSubtitle: string;
  footerText: string;
};

export type IntegrationsConfiguration = {
  smtp: {
    host: string;
    port: number;
    username: string;
    fromEmail: string;
    useTls: boolean;
    enabled: boolean;
  };
  googleCalendar: { enabled: boolean; clientId: string };
  microsoftOutlook: { enabled: boolean; tenantId: string };
  storageProvider: "supabase" | "s3" | "azure";
  webhookUrl: string;
  webhookSecret: string;
  apiKeysEnabled: boolean;
};

export type BackupConfiguration = {
  backupFrequency: "hourly" | "daily" | "weekly";
  maintenanceMode: boolean;
  maintenanceMessage: string;
  logRetentionDays: number;
};

export type CompanySettingsBundle = {
  profile: OrganizationProfile;
  working: WorkingConfiguration;
  leave: LeavePoliciesConfiguration;
  payroll: PayrollSettingsRecord;
  recruitment: RecruitmentSettings;
  performance: PerformanceSettingsRecord;
  notifications: NotificationsGlobalConfiguration;
  security: SecurityConfiguration;
  branding: BrandingConfiguration;
  integrations: IntegrationsConfiguration;
  backup: BackupConfiguration;
  shiftTemplates: { id: string; label: string }[];
  recruitmentManagers: { id: string; label: string }[];
};

export type CompanySettingsActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };
