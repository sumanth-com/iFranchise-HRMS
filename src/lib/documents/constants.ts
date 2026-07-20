import { hasAnyPermission } from "@/lib/permissions/utils";
import type { LetterType } from "@/types/documents";

export const DOCUMENTS_ROUTES = {
  dashboard: "/dashboard/documents-management",
  employeeDocuments: "/dashboard/documents-management/employees",
  employeeDocument: (employeeId: string) =>
    `/dashboard/documents-management/employees/${employeeId}`,
  letters: "/dashboard/documents-management/letters",
  templates: "/dashboard/documents-management/templates",
  expiring: "/dashboard/documents-management/expiring",
  settings: "/dashboard/documents-management/settings",
} as const;

/** Personal / self-service documents in the HR portal main nav. */
export const SELF_DOCUMENTS_ROUTES = {
  list: "/dashboard/documents",
} as const;

export const DOCUMENTS_SUB_NAV = [
  { title: "Dashboard", href: DOCUMENTS_ROUTES.dashboard },
  { title: "Employee Documents", href: DOCUMENTS_ROUTES.employeeDocuments },
  { title: "Company Letters", href: DOCUMENTS_ROUTES.letters },
  { title: "Templates", href: DOCUMENTS_ROUTES.templates },
  { title: "Expiring Documents", href: DOCUMENTS_ROUTES.expiring },
  { title: "Settings", href: DOCUMENTS_ROUTES.settings },
] as const;

export const DOCUMENTS_STORAGE_BUCKET = "employee-documents";

export const LETTER_TYPE_OPTIONS: { value: LetterType; label: string; documentTypeCode: string }[] = [
  { value: "offer_letter", label: "Offer Letter", documentTypeCode: "OFFER_LETTER" },
  { value: "appointment_letter", label: "Appointment Letter", documentTypeCode: "APPOINTMENT_LETTER" },
  { value: "confirmation_letter", label: "Confirmation Letter", documentTypeCode: "CONFIRMATION_LETTER" },
  { value: "promotion_letter", label: "Promotion Letter", documentTypeCode: "PROMOTION_LETTER" },
  { value: "salary_revision_letter", label: "Salary Revision Letter", documentTypeCode: "SALARY_REVISION_LETTER" },
  { value: "warning_letter", label: "Warning Letter", documentTypeCode: "WARNING_LETTER" },
  { value: "appreciation_letter", label: "Appreciation Letter", documentTypeCode: "APPRECIATION_LETTER" },
  { value: "experience_letter", label: "Experience Letter", documentTypeCode: "EXPERIENCE_LETTER" },
  { value: "relieving_letter", label: "Relieving Letter", documentTypeCode: "RELIEVING_LETTER" },
  { value: "termination_letter", label: "Termination Letter", documentTypeCode: "TERMINATION_LETTER" },
  {
    value: "resignation_acceptance_letter",
    label: "Acceptance of Resignation",
    documentTypeCode: "RESIGNATION_ACCEPTANCE_LETTER",
  },
  {
    value: "settlement_letter",
    label: "Final Settlement Letter",
    documentTypeCode: "SETTLEMENT_LETTER",
  },
];

export const LETTER_TYPE_LABELS: Record<LetterType, string> = Object.fromEntries(
  LETTER_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<LetterType, string>;

export const TEMPLATE_PLACEHOLDERS = [
  "employeeName",
  "employeeCode",
  "designation",
  "department",
  "joiningDate",
  "salary",
  "companyName",
  "manager",
  "currentDate",
] as const;

export const DOCUMENT_STATUS_LABELS = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
  expired: "Expired",
} as const;

export const LETTER_STATUS_LABELS = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  published: "Published",
  archived: "Archived",
} as const;

export const DEFAULT_DOCUMENT_SETTINGS = {
  documentCategories: [
    "Identity",
    "Employment",
    "Letters",
    "Compliance",
    "Certificates",
    "Other",
  ],
  allowedFileTypes: [
    "pdf",
    "doc",
    "docx",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "xls",
    "xlsx",
    "zip",
  ],
  maxUploadSizeMb: 20,
  documentNumberPrefix: "DOC",
  autoVerification: false,
  requireHrApprovalForLetters: true,
  enableEmployeeDownloads: true,
  retentionPeriodDays: 2555,
} as const;

export const DASHBOARD_CHART_TYPES = [
  "OFFER_LETTER",
  "APPOINTMENT_LETTER",
  "NDA",
  "PAN",
  "AADHAAR",
  "RESUME",
  "PROMOTION_LETTER",
  "SALARY_REVISION_LETTER",
  "EXPERIENCE_LETTER",
] as const;

export function canViewDocuments(codes: string[]) {
  return hasAnyPermission(codes, ["documents.view", "documents.manage"]);
}

export function canUploadDocuments(codes: string[]) {
  return hasAnyPermission(codes, ["documents.upload", "documents.manage", "documents.edit"]);
}

export function canEditDocuments(codes: string[]) {
  return hasAnyPermission(codes, ["documents.edit", "documents.manage", "documents.verify"]);
}

export function canDeleteDocuments(codes: string[]) {
  return hasAnyPermission(codes, ["documents.delete", "documents.manage"]);
}

export function canDownloadDocuments(codes: string[]) {
  return hasAnyPermission(codes, ["documents.download", "documents.view", "documents.manage"]);
}

export function canGenerateLetters(codes: string[]) {
  return hasAnyPermission(codes, ["documents.generate", "documents.manage"]);
}

export function canManageTemplates(codes: string[]) {
  return hasAnyPermission(codes, ["documents.template.manage", "documents.manage"]);
}

export function canManageDocumentSettings(codes: string[]) {
  return hasAnyPermission(codes, ["documents.manage", "settings.manage", "documents.template.manage"]);
}

export function isHrOrAdmin(profile: { roles: { code: string }[] }) {
  return profile.roles.some((r) => r.code === "super_admin" || r.code === "hr_admin");
}

export function isManager(profile: { roles: { code: string }[] }) {
  return profile.roles.some((r) => r.code === "manager");
}
