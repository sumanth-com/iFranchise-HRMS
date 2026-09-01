export const COMPANY_ANNOUNCEMENT_CATEGORIES = [
  "general",
  "hr",
  "policy",
  "payroll",
  "compliance",
  "holiday",
  "important",
] as const;

export const COMPANY_ANNOUNCEMENT_PRIORITIES = ["normal", "important", "critical"] as const;

export const COMPANY_ANNOUNCEMENT_STATUSES = ["draft", "published", "archived"] as const;

export const COMPANY_ANNOUNCEMENT_AUDIENCES = [
  "all_employees",
  "department",
  "employees",
] as const;

export type CompanyAnnouncementCategory = (typeof COMPANY_ANNOUNCEMENT_CATEGORIES)[number];
export type CompanyAnnouncementPriority = (typeof COMPANY_ANNOUNCEMENT_PRIORITIES)[number];
export type CompanyAnnouncementLifecycleStatus =
  (typeof COMPANY_ANNOUNCEMENT_STATUSES)[number];
export type CompanyAnnouncementAudience = (typeof COMPANY_ANNOUNCEMENT_AUDIENCES)[number];

export const COMPANY_ANNOUNCEMENT_ICON_KEYS = [
  "megaphone",
  "users",
  "building",
  "user",
  "file-text",
  "wallet",
  "shield",
  "calendar",
  "bell",
  "briefcase",
] as const;

export type CompanyAnnouncementIconKey = (typeof COMPANY_ANNOUNCEMENT_ICON_KEYS)[number];

export type CompanyAnnouncementAttachment = {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  storagePath: string;
  url: string | null;
};

export type CompanyAnnouncementListItem = {
  id: string;
  status: CompanyAnnouncementLifecycleStatus;
  requiresAcknowledgement: boolean;
  audienceType: CompanyAnnouncementAudience;
  publishAt: string | null;
  expiresAt: string | null;
  publishedAt: string | null;
  versionId: string | null;
  versionNumber: number;
  title: string;
  shortDescription: string | null;
  category: CompanyAnnouncementCategory;
  priority: CompanyAnnouncementPriority;
  iconKey: CompanyAnnouncementIconKey;
  acknowledgedCount: number;
  audienceCount: number;
  updatedAt: string;
};

export type CompanyAnnouncementDetail = CompanyAnnouncementListItem & {
  content: string;
  departmentIds: string[];
  employeeIds: string[];
  attachments: CompanyAnnouncementAttachment[];
};

export type CompanyAnnouncementEmployeeView = {
  id: string;
  versionId: string;
  versionNumber: number;
  title: string;
  shortDescription: string | null;
  content: string;
  category: CompanyAnnouncementCategory;
  priority: CompanyAnnouncementPriority;
  iconKey: CompanyAnnouncementIconKey;
  publishAt: string | null;
  publishedAt: string | null;
  requiresAcknowledgement: boolean;
  acknowledgedAt: string | null;
  attachments: CompanyAnnouncementAttachment[];
  companyName: string;
};

export type AcknowledgementTrackerRow = {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  status: "acknowledged" | "pending";
  acknowledgedAt: string | null;
  acknowledgementId: string | null;
  versionNumber: number | null;
};

export type AcknowledgementProof = {
  announcementTitle: string;
  employeeName: string;
  employeeCode: string;
  employeeEmail: string | null;
  status: "acknowledged";
  acknowledgedAt: string;
  versionLabel: string;
  publishedAt: string | null;
  ipAddress: string | null;
};

export type AcknowledgementTracker = {
  announcementId: string;
  title: string;
  versionNumber: number;
  total: number;
  acknowledged: number;
  pending: number;
  completionPercent: number;
  rows: AcknowledgementTrackerRow[];
};
