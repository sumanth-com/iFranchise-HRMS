import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import { hasAnyPermission } from "@/lib/permissions/utils";
import type {
  CompanyAnnouncementAudience,
  CompanyAnnouncementCategory,
  CompanyAnnouncementLifecycleStatus,
  CompanyAnnouncementPriority,
} from "@/types/company-announcement";

export const COMPANY_ANNOUNCEMENT_MANAGE_PERMISSION = "company_announcement.manage";

export const COMPANY_ANNOUNCEMENT_BUCKET = "company-assets";
export const COMPANY_ANNOUNCEMENT_MAX_BYTES = 10 * 1024 * 1024;
export const COMPANY_ANNOUNCEMENT_ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export const COMPANY_ANNOUNCEMENT_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export function isAllowedAnnouncementFile(file: { name: string; type: string }) {
  if (COMPANY_ANNOUNCEMENT_ALLOWED_TYPES.has(file.type)) return true;
  const lower = file.name.toLowerCase();
  return COMPANY_ANNOUNCEMENT_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export const COMPANY_ANNOUNCEMENT_CATEGORY_LABELS: Record<CompanyAnnouncementCategory, string> = {
  general: "General",
  hr: "HR",
  policy: "Policy",
  payroll: "Payroll",
  compliance: "Compliance",
  holiday: "Holiday",
  important: "Important",
};

export const COMPANY_ANNOUNCEMENT_PRIORITY_LABELS: Record<CompanyAnnouncementPriority, string> = {
  normal: "Normal",
  important: "Important",
  critical: "Critical",
};

export const COMPANY_ANNOUNCEMENT_STATUS_LABELS: Record<CompanyAnnouncementLifecycleStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const COMPANY_ANNOUNCEMENT_AUDIENCE_LABELS: Record<CompanyAnnouncementAudience, string> = {
  all_employees: "All Employees",
  department: "Specific Department",
  employees: "Specific Employees",
};

export const COMPANY_ANNOUNCEMENT_MANAGE_PERMISSIONS = [
  COMPANY_ANNOUNCEMENT_MANAGE_PERMISSION,
  "portal.ceo.access",
  "portal.hr.access",
] as const;

export function canManageCompanyAnnouncements(codes: string[]) {
  return hasAnyPermission(codes, [...COMPANY_ANNOUNCEMENT_MANAGE_PERMISSIONS]);
}

export function canViewCompanyAnnouncements(codes: string[]) {
  return hasAnyPermission(codes, [
    ...COMPANY_ANNOUNCEMENT_MANAGE_PERMISSIONS,
    "organization.view",
    "portal.employee.access",
  ]);
}

export function companyAnnouncementStorageFolder(organizationId: string, announcementId: string) {
  return `${organizationId}/company-announcements/${announcementId}`;
}

export function revalidateCompanyAnnouncementPaths() {
  return [
    ORGANIZATION_ROUTES.announcements,
    "/ceo/organization/announcements",
    "/employee/announcements",
    "/employee",
  ];
}
