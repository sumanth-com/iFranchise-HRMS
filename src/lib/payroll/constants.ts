import { hasAnyPermission } from "@/lib/permissions/utils";
import type {
  BonusStatus,
  BonusType,
  PayrollStatus,
  ReimbursementCategory,
  ReimbursementStatus,
  SalaryRevisionStatus,
} from "@/types/payroll";

export const PAYROLL_ROUTES = {
  dashboard: "/dashboard/payroll-management",
  run: "/dashboard/payroll-management/run",
  history: "/dashboard/payroll-management/history",
  detail: (id: string) => `/dashboard/payroll-management/${id}`,
  salaryStructures: "/dashboard/payroll-management/salary-structures",
  newSalaryStructure: "/dashboard/payroll-management/salary-structures/new",
  revisions: "/dashboard/payroll-management/revisions",
  bonuses: "/dashboard/payroll-management/bonuses",
  reimbursements: "/dashboard/payroll-management/reimbursements",
  payslips: "/dashboard/payroll-management/payslips",
  payslipDetail: (id: string) => `/dashboard/payroll-management/payslips/${id}`,
  settings: "/dashboard/payroll-management/settings",
} as const;

/** Personal / self-service payroll in the HR portal main nav. */
export const SELF_PAYROLL_ROUTES = {
  list: "/dashboard/payroll",
} as const;

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: "Draft",
  processing: "Processing",
  processed: "Processed",
  approved: "Approved",
  paid: "Paid",
  cancelled: "Cancelled",
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
  totalPayroll: "Total Payroll",
  employeesProcessed: "Employees Processed",
  pendingPayroll: "Pending Payroll",
  grossPayroll: "Gross Payroll",
  totalDeductions: "Total Deductions",
  netPayroll: "Net Payroll",
} as const;

const PAYROLL_VIEW = ["payroll.view"];
const PAYROLL_CREATE = ["payroll.create", "payroll.generate"];
const PAYROLL_EDIT = ["payroll.edit", "payroll.process"];
const PAYROLL_RUN = ["payroll.run", "payroll.process", "payroll.generate"];
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

export const PAYROLL_SUB_NAV = [
  { title: "Dashboard", href: PAYROLL_ROUTES.dashboard },
  { title: "Run Payroll", href: PAYROLL_ROUTES.run },
  { title: "Salary Structure", href: PAYROLL_ROUTES.salaryStructures },
  { title: "Payroll History", href: PAYROLL_ROUTES.history },
  { title: "Salary Revisions", href: PAYROLL_ROUTES.revisions },
  { title: "Bonuses", href: PAYROLL_ROUTES.bonuses },
  { title: "Reimbursements", href: PAYROLL_ROUTES.reimbursements },
  { title: "Payslips", href: PAYROLL_ROUTES.payslips },
  { title: "Settings", href: PAYROLL_ROUTES.settings },
] as const;
