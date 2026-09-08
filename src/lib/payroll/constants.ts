import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { hasAnyPermission } from "@/lib/permissions/utils";
import { hubListUrl } from "@/lib/dashboard/hub-paths";
import type {
  BonusStatus,
  BonusType,
  PayrollStatus,
  ReimbursementCategory,
  ReimbursementStatus,
  SalaryRevisionStatus,
} from "@/types/payroll";

/** Personal / self-service payroll in the HR portal main nav. */
export const SELF_PAYROLL_ROUTES = {
  list: "/dashboard/payroll",
  team: "/dashboard/payroll/team",
  policy: "/dashboard/payroll/policy",
} as const;

export const PAYROLL_ROUTES = {
  dashboard: "/dashboard/payroll-management",
  run: "/dashboard/payroll-management/run",
  history: "/dashboard/payroll-management/history",
  detail: (id: string) => `/dashboard/payroll-management/${id}`,
  salaryStructures: "/dashboard/payroll-management/salary-structures",
  newSalaryStructure: "/dashboard/payroll-management/salary-structures/new",
  editSalaryStructure: (id: string) =>
    `/dashboard/payroll-management/salary-structures/${id}/edit`,
  revisions: "/dashboard/payroll-management/revisions",
  bonuses: "/dashboard/payroll-management/bonuses",
  reimbursements: "/dashboard/payroll-management/reimbursements",
  payslips: "/dashboard/payroll-management/payslips",
  payslipHistory: "/dashboard/payroll-management/payslips/history",
  payslipDetail: (id: string) => `/dashboard/payroll-management/payslips/${id}`,
  policy: "/dashboard/payroll-management/policy",
  settings: "/dashboard/payroll-management/settings",
} as const;

export const TEAM_PAYROLL_SECTIONS = {
  run: "run",
  "salary-structures": "salary-structures",
  bonuses: "bonuses",
  reimbursements: "reimbursements",
  payslips: "payslips",
  settings: "settings",
  "employee-accounts": "employee-accounts",
} as const;

export type TeamPayrollSection = keyof typeof TEAM_PAYROLL_SECTIONS;

const TEAM_PAYROLL_SECTION_SET = new Set<string>(Object.values(TEAM_PAYROLL_SECTIONS));

const REMOVED_TEAM_PAYROLL_SECTIONS = new Set(["dashboard", "history", "revisions"]);

export function parseTeamPayrollSection(value: string | undefined): TeamPayrollSection {
  if (value && REMOVED_TEAM_PAYROLL_SECTIONS.has(value)) {
    return TEAM_PAYROLL_SECTIONS.run;
  }
  if (value && TEAM_PAYROLL_SECTION_SET.has(value)) {
    return value as TeamPayrollSection;
  }
  return TEAM_PAYROLL_SECTIONS.run;
}

export function payrollHubUrl(
  options?: {
    tab?: "my" | "team";
    section?: TeamPayrollSection;
    params?: Record<string, string | undefined>;
  },
) {
  const tab = options?.tab ?? "team";
  let path: string = SELF_PAYROLL_ROUTES.list;

  if (tab === "team") {
    const section = options?.section ?? TEAM_PAYROLL_SECTIONS.run;
    path = `${SELF_PAYROLL_ROUTES.team}/${section}`;
  }

  const filterParams: Record<string, string | undefined> = {};
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value && key !== "tab" && key !== "section") {
        filterParams[key] = value;
      }
    });
  }

  return hubListUrl(path, filterParams);
}

export function payrollTeamSectionPath(section: TeamPayrollSection): string {
  return `${SELF_PAYROLL_ROUTES.team}/${section}`;
}

export function payrollTeamListUrl(
  searchParams?: Record<string, string | undefined>,
  section: TeamPayrollSection = TEAM_PAYROLL_SECTIONS.run,
) {
  return payrollHubUrl({ tab: "team", section, params: searchParams });
}

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: "Draft",
  processing: "Processing",
  processed: "Reviewed",
  approved: "Reviewed",
  paid: "Sent",
  cancelled: "Cancelled",
};

export const PAYROLL_ITEM_STATUS_LABELS: Record<
  "draft" | "reviewed" | "sent" | "locked",
  string
> = {
  draft: "Draft",
  reviewed: "Reviewed",
  sent: "Sent",
  locked: "Locked",
};

export const BONUS_TYPE_LABELS: Record<BonusType, string> = {
  festival: "Festival Bonus",
  performance: "Performance Bonus",
  referral: "Referral Bonus",
  retention: "Retention Bonus",
  joining: "Joining Bonus",
  special: "Special Bonus",
  annual: "Annual Bonus",
  other: "Other",
};

export const BONUS_APPROVAL_LEVEL_LABELS: Record<number, string> = {
  1: "HR Review",
  2: "Finance Review",
  3: "Super Admin Approval",
};

export const BONUS_WORKFLOW_STEPS = [
  "HR Creates Bonus",
  "Finance Reviews",
  "Super Admin Approves",
  "Payroll Includes Bonus",
  "Appears in Payslip",
] as const;

export const BONUS_STATUS_LABELS: Record<BonusStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const REIMBURSEMENT_CATEGORY_LABELS: Record<ReimbursementCategory, string> = {
  food: "Food",
  fuel: "Fuel",
  hotel_accommodation: "Hotel & Accommodation",
  medical: "Medical",
  telephone: "Telephone",
  travel: "Travel",
  other: "Other",
  internet: "Internet",
  laptop: "Laptop",
};

/** Categories shown on the employee claim form (legacy internet/laptop kept in DB labels). */
export const EMPLOYEE_REIMBURSEMENT_CATEGORIES: ReimbursementCategory[] = [
  "food",
  "fuel",
  "hotel_accommodation",
  "medical",
  "telephone",
  "travel",
  "other",
];

export const REIMBURSEMENT_STORAGE_BUCKET = "employee-documents";
export const REIMBURSEMENT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const REIMBURSEMENT_MAX_FILES = 5;

/** MIME types accepted for reimbursement receipts (PDF + common images). */
export const REIMBURSEMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/x-ms-bmp",
  "image/tiff",
  "image/tif",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/x-png",
] as const;

/**
 * Extensions without leading dots — matches `validateUploadFile` / `extensionFromFileName`.
 */
export const REIMBURSEMENT_ALLOWED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "jpe",
  "png",
  "webp",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "heic",
  "heif",
  "avif",
] as const;

export const REIMBURSEMENT_ACCEPT_ATTR = [
  "image/*",
  "application/pdf",
  ...REIMBURSEMENT_ALLOWED_EXTENSIONS.map((ext) => `.${ext}`),
].join(",");

export const REIMBURSEMENT_FILE_HINT =
  "Images (JPG, PNG, WebP, GIF, …) or PDF · up to 5 MB each · max 5 files";

export function isAllowedReimbursementMimeType(mimeType?: string | null): boolean {
  const mime = (mimeType ?? "").trim().toLowerCase();
  if (!mime) return true;
  if (mime === "application/octet-stream") return true;
  if (mime === "application/pdf") return true;
  if (mime.startsWith("image/")) return true;
  return (REIMBURSEMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export function isAllowedReimbursementExtension(fileName: string): boolean {
  const parts = fileName.toLowerCase().split(".");
  if (parts.length < 2) return false;
  const ext = parts.pop() ?? "";
  return (REIMBURSEMENT_ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

/** Shared client/server check for reimbursement receipt uploads. */
export function validateReimbursementAttachmentFile(input: {
  fileName: string;
  fileSize: number;
  mimeType?: string | null;
}): void {
  if (input.fileSize <= 0) {
    throw new Error("File is empty");
  }
  if (input.fileSize > REIMBURSEMENT_MAX_FILE_BYTES) {
    throw new Error("File exceeds maximum size of 5 MB");
  }
  if (!isAllowedReimbursementExtension(input.fileName)) {
    const parts = input.fileName.toLowerCase().split(".");
    const ext = parts.length >= 2 ? parts.pop() : "";
    throw new Error(`File type .${ext || "unknown"} is not allowed`);
  }
  if (!isAllowedReimbursementMimeType(input.mimeType)) {
    throw new Error("File MIME type is not allowed");
  }
}

export const REIMBURSEMENT_STATUS_LABELS: Record<ReimbursementStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const SALARY_REVISION_STATUS_LABELS: Record<SalaryRevisionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  applied: "Applied",
  cancelled: "Cancelled",
};

export const PAYROLL_APPROVAL_LEVEL_LABELS: Record<number, string> = {
  1: "HR Approval",
  2: "Finance Approval",
  3: "Super Admin Approval",
};

export const PAYROLL_SUMMARY_LABELS = {
  totalPayroll: "Total Payroll (YTD)",
  employeesProcessed: "Employees Processed",
  pendingPayroll: "Pending Payroll",
  grossPayroll: "Attendance Earnings",
  totalDeductions: "Total Deductions",
  netPayroll: "Net Payroll",
} as const;

const PAYROLL_VIEW = ["payroll.view"];
const PAYROLL_CREATE = ["payroll.create", "payroll.generate"];
const PAYROLL_EDIT = ["payroll.edit", "payroll.process"];
const PAYROLL_RUN = [
  "payroll.run",
  "payroll.process",
  "payroll.generate",
  PORTAL_PERMISSIONS.ceo,
];
const PAYROLL_APPROVE = ["payroll.approve"];
const PAYROLL_DOWNLOAD = ["payroll.download", "payslip.generate", "payslip.view"];
const SALARY_VIEW = ["salary.view", "salary_structure.view"];
const SALARY_EDIT = ["salary.edit", "salary_structure.edit", "salary_structure.create"];
const BONUS_VIEW = ["bonus.view", "payroll.view"];
const BONUS_CREATE = ["bonus.create", "payroll.create", "payroll.generate"];
const BONUS_APPROVE = ["bonus.approve", "payroll.approve"];
const REIMBURSEMENT_VIEW = ["reimbursement.view", "payroll.view"];
const REIMBURSEMENT_CREATE = [
  "reimbursement.create",
  "payroll.create",
  "payroll.generate",
];
const REIMBURSEMENT_APPROVE = ["reimbursement.approve", "payroll.approve"];

export function canViewPayroll(codes: string[]) {
  return hasAnyPermission(codes, PAYROLL_VIEW);
}

export function canCreatePayroll(codes: string[]) {
  return hasAnyPermission(codes, PAYROLL_CREATE);
}

export function canEditPayroll(codes: string[]) {
  return hasAnyPermission(codes, PAYROLL_EDIT);
}

export function canRunPayroll(codes: string[]) {
  return hasAnyPermission(codes, PAYROLL_RUN);
}

export function canApprovePayroll(codes: string[]) {
  return hasAnyPermission(codes, PAYROLL_APPROVE);
}

export function canDownloadPayroll(codes: string[]) {
  return hasAnyPermission(codes, PAYROLL_DOWNLOAD);
}

export function canViewSalary(codes: string[]) {
  return hasAnyPermission(codes, SALARY_VIEW);
}

export function canEditSalary(codes: string[]) {
  return hasAnyPermission(codes, SALARY_EDIT);
}

export function canViewBonus(codes: string[]) {
  return hasAnyPermission(codes, BONUS_VIEW);
}

export function canCreateBonus(codes: string[]) {
  return hasAnyPermission(codes, BONUS_CREATE);
}

export function canApproveBonus(codes: string[]) {
  return hasAnyPermission(codes, BONUS_APPROVE);
}

export function canViewReimbursement(codes: string[]) {
  return hasAnyPermission(codes, REIMBURSEMENT_VIEW);
}

export function canCreateReimbursement(codes: string[]) {
  return hasAnyPermission(codes, REIMBURSEMENT_CREATE);
}

export function canApproveReimbursement(codes: string[]) {
  return hasAnyPermission(codes, REIMBURSEMENT_APPROVE);
}

const BANK_ACCOUNT_VIEW = ["bank_account.view", "payroll.view"];
const BANK_ACCOUNT_EDIT = ["bank_account.edit", "bank_account.create"];

export function canViewBankAccounts(codes: string[]) {
  return hasAnyPermission(codes, BANK_ACCOUNT_VIEW);
}

export function canEditBankAccounts(codes: string[]) {
  return hasAnyPermission(codes, BANK_ACCOUNT_EDIT);
}

export const TEAM_PAYROLL_SECTION_DESCRIPTIONS: Record<TeamPayrollSection, string> = {
  run: "Monthly payroll calculated from salary structures, attendance, and leave — review amounts and release payslips for the selected period.",
  "salary-structures":
    "Set up and update employee salary structures, components, and effective dates across the organization.",
  bonuses:
    "Record one-time bonuses and track HR → Finance approval before they are included in the monthly run.",
  reimbursements:
    "Review employee expense claims and approve payouts to be settled through payroll.",
  payslips:
    "Access published payslips — preview, download PDFs, and email copies to employees.",
  "employee-accounts":
    "Maintain employee identity and salary bank account details used for payroll and payslips.",
  settings:
    "Payroll cycle, processing schedule, salary credit day, and payslip availability for your organization.",
};

export const TEAM_PAYROLL_SECTION_TITLES: Record<TeamPayrollSection, string> = {
  run: "Company Payroll",
  "salary-structures": "Salary Structure",
  bonuses: "Bonuses",
  reimbursements: "Reimbursements",
  payslips: "Payslips",
  "employee-accounts": "Employee Accounts",
  settings: "Settings",
};

export function teamPayrollSectionTitle(section: TeamPayrollSection): string {
  return TEAM_PAYROLL_SECTION_TITLES[section];
}

export function isCeoTeamPayrollBasePath(basePath: string): boolean {
  return basePath.startsWith("/ceo/payroll");
}

/** CEO portal uses "Team Payroll" for the run section; HR keeps "Company Payroll". */
export function teamPayrollSectionTitleForPortal(
  section: TeamPayrollSection,
  options?: { ceoPortal?: boolean },
): string {
  if (section === TEAM_PAYROLL_SECTIONS.run && options?.ceoPortal) {
    return "Team Payroll";
  }
  return TEAM_PAYROLL_SECTION_TITLES[section];
}

export function teamPayrollSectionDescription(section: TeamPayrollSection): string {
  return TEAM_PAYROLL_SECTION_DESCRIPTIONS[section];
}

export const PAYROLL_SUB_NAV = [
  { title: TEAM_PAYROLL_SECTION_TITLES.run, section: TEAM_PAYROLL_SECTIONS.run },
  {
    title: TEAM_PAYROLL_SECTION_TITLES["salary-structures"],
    section: TEAM_PAYROLL_SECTIONS["salary-structures"],
  },
  {
    title: TEAM_PAYROLL_SECTION_TITLES.reimbursements,
    section: TEAM_PAYROLL_SECTIONS.reimbursements,
  },
  { title: TEAM_PAYROLL_SECTION_TITLES.payslips, section: TEAM_PAYROLL_SECTIONS.payslips },
  {
    title: TEAM_PAYROLL_SECTION_TITLES["employee-accounts"],
    section: TEAM_PAYROLL_SECTIONS["employee-accounts"],
  },
  { title: TEAM_PAYROLL_SECTION_TITLES.settings, section: TEAM_PAYROLL_SECTIONS.settings },
].map((item) => ({
  title: item.title,
  section: item.section,
  description: TEAM_PAYROLL_SECTION_DESCRIPTIONS[item.section as TeamPayrollSection],
  href: payrollHubUrl({ tab: "team", section: item.section }),
}));
