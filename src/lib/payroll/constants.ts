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
  travel: "Travel",
  food: "Food",
  fuel: "Fuel",
  internet: "Internet",
  laptop: "Laptop",
  other: "Other",
};

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
  settings:
    "Payroll cycle, processing schedule, salary credit day, and payslip availability for your organization.",
};

export const TEAM_PAYROLL_SECTION_TITLES: Record<TeamPayrollSection, string> = {
  run: "Company Payroll",
  "salary-structures": "Salary Structure",
  bonuses: "Bonuses",
  reimbursements: "Expense claims",
  payslips: "Payslips",
  settings: "Settings",
};

export function teamPayrollSectionTitle(section: TeamPayrollSection): string {
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
  { title: TEAM_PAYROLL_SECTION_TITLES.payslips, section: TEAM_PAYROLL_SECTIONS.payslips },
  { title: TEAM_PAYROLL_SECTION_TITLES.settings, section: TEAM_PAYROLL_SECTIONS.settings },
].map((item) => ({
  title: item.title,
  section: item.section,
  description: TEAM_PAYROLL_SECTION_DESCRIPTIONS[item.section as TeamPayrollSection],
  href: payrollHubUrl({ tab: "team", section: item.section }),
}));
