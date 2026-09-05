import { hasAnyPermission } from "@/lib/permissions/utils";
import { hubListUrl, hubTeamListUrl } from "@/lib/dashboard/hub-paths";
import type { LetterType } from "@/types/documents";

/** Personal / self-service documents in the HR portal main nav. */
export const SELF_DOCUMENTS_ROUTES = {
  list: "/dashboard/documents",
  team: "/dashboard/documents/team",
} as const;

export const TEAM_DOCUMENTS_SECTIONS = {
  employees: "employees",
  letters: "letters",
  templates: "templates",
  expiring: "expiring",
  settings: "settings",
} as const;

export type TeamDocumentsSection = keyof typeof TEAM_DOCUMENTS_SECTIONS;

const TEAM_DOCUMENTS_SECTION_SET = new Set<string>(Object.values(TEAM_DOCUMENTS_SECTIONS));

export function parseTeamDocumentsSection(value: string | undefined): TeamDocumentsSection | null {
  if (value && TEAM_DOCUMENTS_SECTION_SET.has(value)) {
    return value as TeamDocumentsSection;
  }
  return null;
}

export function teamDocumentsSectionPath(section: TeamDocumentsSection) {
  return `${SELF_DOCUMENTS_ROUTES.team}/${section}`;
}

export const TEAM_DOCUMENTS_SECTION_DESCRIPTIONS: Record<
  TeamDocumentsSection | "overview",
  string
> = {
  overview:
    "Organization-wide document stats, recent activity, and quick access to HR document workflows.",
  employees: "Browse employee folders, upload files, and verify submitted documents.",
  letters: "Generate, publish, and manage company letters for employees.",
  templates: "Create and maintain letter templates used for document generation.",
  expiring: "Track credentials and documents approaching expiry or already expired.",
  settings: "Configure upload rules, categories, and document workflow defaults.",
};

export function teamDocumentsSectionDescription(
  section: TeamDocumentsSection | "overview",
) {
  return TEAM_DOCUMENTS_SECTION_DESCRIPTIONS[section];
}

export function documentsHubUrl(
  options?: {
    section?: TeamDocumentsSection | "overview";
    params?: Record<string, string | undefined>;
  },
) {
  const section = options?.section ?? "overview";
  const path =
    section === "overview"
      ? SELF_DOCUMENTS_ROUTES.team
      : teamDocumentsSectionPath(section);

  const filterParams: Record<string, string | undefined> = {};
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value) filterParams[key] = value;
    });
  }

  return hubListUrl(path, filterParams);
}

export const DOCUMENTS_ROUTES = {
  dashboard: SELF_DOCUMENTS_ROUTES.team,
  employeeDocuments: teamDocumentsSectionPath(TEAM_DOCUMENTS_SECTIONS.employees),
  employeeDocument: (employeeId: string) =>
    `${teamDocumentsSectionPath(TEAM_DOCUMENTS_SECTIONS.employees)}/${employeeId}`,
  letters: teamDocumentsSectionPath(TEAM_DOCUMENTS_SECTIONS.letters),
  templates: teamDocumentsSectionPath(TEAM_DOCUMENTS_SECTIONS.templates),
  expiring: teamDocumentsSectionPath(TEAM_DOCUMENTS_SECTIONS.expiring),
  settings: teamDocumentsSectionPath(TEAM_DOCUMENTS_SECTIONS.settings),
} as const;

/** Personal profile in the HR portal self-service section. */
export const SELF_PROFILE_ROUTES = {
  profile: "/dashboard/profile",
} as const;

export function documentsTeamListUrl(
  searchParams?: Record<string, string | undefined>,
) {
  return hubTeamListUrl(SELF_DOCUMENTS_ROUTES.list, searchParams);
}

export const TEAM_DOCUMENTS_SUB_NAV = [
  { title: "Overview", section: "overview" as const },
  { title: "Employees", section: TEAM_DOCUMENTS_SECTIONS.employees },
  { title: "Letters", section: TEAM_DOCUMENTS_SECTIONS.letters },
  { title: "Templates", section: TEAM_DOCUMENTS_SECTIONS.templates },
  { title: "Expiring", section: TEAM_DOCUMENTS_SECTIONS.expiring },
  { title: "Settings", section: TEAM_DOCUMENTS_SECTIONS.settings },
].map((item) => ({
  title: item.title,
  section: item.section,
  description: TEAM_DOCUMENTS_SECTION_DESCRIPTIONS[item.section],
  href: documentsHubUrl({ section: item.section }),
}));

/** @deprecated Use TEAM_DOCUMENTS_SUB_NAV in the team documents hub. */
export const DOCUMENTS_SUB_NAV = TEAM_DOCUMENTS_SUB_NAV;

/** Legacy bucket — still used for generated letters and older paths. */
export const DOCUMENTS_STORAGE_BUCKET = "employee-documents";

/** Primary bucket for new employee document uploads. */
export const HRMS_DOCUMENTS_STORAGE_BUCKET = "hrms-documents";

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
  { value: "resignation_acceptance_letter", label: "Acceptance of Resignation", documentTypeCode: "RESIGNATION_ACCEPTANCE_LETTER" },
  { value: "settlement_letter", label: "Final Settlement Letter", documentTypeCode: "SETTLEMENT_LETTER" },
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
  maxUploadSizeMb: 10,
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
