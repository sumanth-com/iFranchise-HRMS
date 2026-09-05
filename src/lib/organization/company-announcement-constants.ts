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
export const COMPANY_ANNOUNCEMENT_MAX_MB = 10;

/** Preview-supported attachments only (PDF + images). */
export const COMPANY_ANNOUNCEMENT_ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const COMPANY_ANNOUNCEMENT_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

export const COMPANY_ANNOUNCEMENT_ACCEPT_ATTR =
  COMPANY_ANNOUNCEMENT_ALLOWED_EXTENSIONS.join(",");

export const COMPANY_ANNOUNCEMENT_FILE_HINT =
  "PDF, JPG, PNG, or WebP · up to 10 MB";

export function isAllowedAnnouncementFile(file: { name: string; type: string }) {
  if (file.type && COMPANY_ANNOUNCEMENT_ALLOWED_TYPES.has(file.type)) return true;
  const lower = file.name.toLowerCase();
  return COMPANY_ANNOUNCEMENT_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Resolve a reliable content-type for storage when the browser omits MIME. */
export function resolveAnnouncementContentType(file: { name: string; type: string }): string {
  if (file.type && COMPANY_ANNOUNCEMENT_ALLOWED_TYPES.has(file.type)) {
    return file.type;
  }
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return file.type || "application/octet-stream";
}

export function announcementFileValidationError(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!isAllowedAnnouncementFile(file)) {
    return `"${file.name}" is not supported. Upload a PDF or image (JPG, PNG, WebP) only.`;
  }
  if (file.size <= 0) {
    return `"${file.name}" is empty. Please choose another file.`;
  }
  if (file.size > COMPANY_ANNOUNCEMENT_MAX_BYTES) {
    return `"${file.name}" exceeds the ${COMPANY_ANNOUNCEMENT_MAX_MB} MB limit.`;
  }
  return null;
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
