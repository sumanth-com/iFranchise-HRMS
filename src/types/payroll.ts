import type { LookupOption } from "@/types/employee";

export type PayrollStatus =
  | "draft"
  | "processing"
  | "processed"
  | "approved"
  | "paid"
  | "cancelled";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "skipped";

export type BonusType =
  | "festival"
  | "performance"
  | "referral"
  | "retention"
  | "joining"
  | "special"
  | "annual"
  | "other";
export type BonusStatus = "pending" | "approved" | "rejected" | "paid" | "cancelled";

export type ReimbursementCategory =
  | "travel"
  | "food"
  | "fuel"
  | "internet"
  | "laptop"
  | "other";
export type ReimbursementStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "cancelled";

export type SalaryRevisionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "applied"
  | "cancelled";

export type PayrollBreakdownLine = {
  code: string;
  label: string;
  amount: number;
  type: "earning" | "deduction";
};

export type PayrollBreakdown = {
  earnings: PayrollBreakdownLine[];
  deductions: PayrollBreakdownLine[];
  attendance: {
    workingDays: number;
    presentDays: number;
    absentDays: number;
    lopDays: number;
    leaveLopDays: number;
    overtimeHours: number;
    leaveDays?: number;
    paidDays?: number;
    holidayCount?: number;
  };
  notes?: string[];
};

export type PayrollListItem = {
  id: string;
  payrollMonth: string;
  payrollStatus: PayrollStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  isLocked: boolean;
  processedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
};

export type PayrollListResult = {
  data: PayrollListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type PayrollSortField =
  | "payroll_month"
  | "payroll_status"
  | "total_net"
  | "created_at";

export type PayrollListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: PayrollSortField;
  sortOrder?: "asc" | "desc";
  month?: number;
  year?: number;
  payrollStatus?: PayrollStatus;
  employeeId?: string;
};

export type PayrollSummary = {
  totalPayroll: number;
  employeesProcessed: number;
  pendingPayroll: number;
  grossPayroll: number;
  totalDeductions: number;
  netPayroll: number;
  monthlyOverview: Array<{
    month: string;
    label: string;
    gross: number;
    net: number;
    status: PayrollStatus | null;
  }>;
};

export type PayrollItemDetail = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  basicSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  breakdown: PayrollBreakdown;
};

export type PayrollApprovalDetail = {
  id: string;
  approvalLevel: number;
  approvalStatus: ApprovalStatus;
  approverEmployeeId: string;
  approverName: string;
  comments: string | null;
  actedAt: string | null;
};

export type PayrollDetail = {
  id: string;
  payrollMonth: string;
  payrollStatus: PayrollStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  isLocked: boolean;
  notes: string | null;
  processedAt: string | null;
  approvedAt: string | null;
  items: PayrollItemDetail[];
  approvals: PayrollApprovalDetail[];
};

export type PayrollPreviewItem = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  hasSalaryStructure: boolean;
  basicSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  breakdown: PayrollBreakdown;
};

export type PayrollPreviewResult = {
  month: number;
  year: number;
  payrollMonth: string;
  items: PayrollPreviewItem[];
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
};

export type PayslipAvailability = "available" | "under_review";

export type PayslipListItem = {
  id: string;
  payslipNumber: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  payrollMonth: string;
  grossSalary: number;
  netSalary: number;
  payrollStatus: PayrollStatus;
  issuedAt: string;
  salaryCreditDate: string;
  publishedAt: string;
  availability: PayslipAvailability;
  canEmployeeAccess: boolean;
  reviewMessage: string | null;
  payslipVersion: string;
  paymentStatus: string;
  isArchived: boolean;
  versionCount: number;
};

export type PayslipHistoryStats = {
  totalPayslips: number;
  yearsAvailable: number[];
  latestSalary: number | null;
  highestSalary: number | null;
  latestPublished: string | null;
};

export type PayslipHistoryYearGroup = {
  year: number;
  payslips: PayslipListItem[];
};

export type PayslipHistoryResult = {
  data: PayslipListItem[];
  groups: PayslipHistoryYearGroup[];
  stats: PayslipHistoryStats;
  total: number;
  page: number;
  pageSize: number;
};

export type PayslipVersionItem = {
  id: string;
  payslipId: string;
  versionNumber: number;
  payslipNumber: string;
  storagePath: string | null;
  salaryCreditDate: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export type PayslipListResult = {
  data: PayslipListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type PayslipDetail = {
  id: string;
  payslipNumber: string;
  issuedAt: string;
  payrollMonth: string;
  payrollStatus: PayrollStatus;
  salaryCreditDate: string;
  publishedAt: string;
  payrollGeneratedAt: string;
  paymentMode: string;
  transactionReference: string | null;
  payslipVersion: string;
  availability: PayslipAvailability;
  canEmployeeAccess: boolean;
  reviewMessage: string | null;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentName: string | null;
    designationTitle: string | null;
    employmentType: string | null;
    branchName: string | null;
    dateOfJoining: string | null;
    pan: string | null;
    uan: string | null;
    pfNumber: string | null;
  };
  organization: {
    name: string;
    addressLines: string[];
    logoUrl: string | null;
    email: string | null;
    phone: string | null;
    footerMessage: string;
    gstNumber: string | null;
    cin: string | null;
  };
  currencyCode: string;
  basicSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  totalEarnings: number;
  employerContributionTotal: number;
  breakdown: PayrollBreakdown;
  employerContributions: PayrollBreakdownLine[];
  bankAccount: {
    bankName: string;
    accountNumberMasked: string;
    ifscCode: string | null;
    accountHolderName: string | null;
  } | null;
  storagePath: string | null;
};

export type SalaryStructureItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  currencyCode: string;
  basicSalary: number;
  hraAmount: number;
  transportAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  netSalary: number;
  taxDeduction: number;
  otherDeductions: number;
  components: SalaryComponents;
  isCurrent: boolean;
};

export type SalaryComponents = {
  specialAllowance?: number;
  medical?: number;
  pf?: number;
  esi?: number;
  professionalTax?: number;
  incomeTax?: number;
  other?: number;
};

export type SalaryStructureListResult = {
  data: SalaryStructureItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type BonusItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  bonusType: BonusType;
  amount: number;
  bonusMonth: string;
  bonusStatus: BonusStatus;
  reason: string | null;
  remarks: string | null;
  attachmentPath: string | null;
  approverName: string | null;
  approvalLevel: number | null;
  createdAt: string;
};

export type BonusListResult = {
  data: BonusItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ReimbursementItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  category: ReimbursementCategory;
  amount: number;
  expenseDate: string;
  reimbursementStatus: ReimbursementStatus;
  description: string | null;
  createdAt: string;
};

export type ReimbursementListResult = {
  data: ReimbursementItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type SalaryRevisionItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  oldGrossSalary: number;
  newGrossSalary: number;
  oldNetSalary: number;
  newNetSalary: number;
  effectiveFrom: string;
  revisionStatus: SalaryRevisionStatus;
  reason: string | null;
  approverName: string | null;
  approvedAt: string | null;
  createdAt: string;
};

export type SalaryRevisionListResult = {
  data: SalaryRevisionItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type PayrollLookups = {
  employees: LookupOption[];
  departments: LookupOption[];
  branches: LookupOption[];
};

export type PayrollActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };
