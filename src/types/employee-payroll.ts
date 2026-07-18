import type {
  BonusItem,
  PayrollBreakdownLine,
  PayrollStatus,
  PayslipDetail,
  PayslipListItem,
  ReimbursementItem,
} from "@/types/payroll";

export type EmployeePayrollBankDetails = {
  bankName: string;
  accountHolderName: string;
  accountNumberMasked: string;
  ifscCode: string | null;
  branchName: string | null;
  accountType: string;
};

export type EmployeeSalaryStructure = {
  effectiveFrom: string;
  currencyCode: string;
  basicSalary: number;
  hraAmount: number;
  transportAllowance: number;
  otherAllowances: number;
  taxDeduction: number;
  otherDeductions: number;
  grossSalary: number;
  netSalary: number;
  earnings: PayrollBreakdownLine[];
  deductions: PayrollBreakdownLine[];
};

export type EmployeePayrollTimelineStage = {
  key: "generated" | "hr_approved" | "released" | "credited";
  label: string;
  at: string | null;
  done: boolean;
};

export type EmployeePayrollTimeline = {
  status: PayrollStatus;
  stages: EmployeePayrollTimelineStage[];
};

export type EmployeePayrollTrendPoint = {
  month: string;
  label: string;
  gross: number;
  net: number;
};

export type EmployeePayrollKpis = {
  currentNetSalary: number | null;
  currentGrossSalary: number | null;
  nextSalaryDate: string | null;
  lastPaymentDate: string | null;
  latestStatus: PayrollStatus | null;
  ytdEarnings: number;
  ytdTax: number;
};

export type EmployeePayrollData = {
  currencyCode: string;
  hasAnyData: boolean;
  kpis: EmployeePayrollKpis;
  /** Full detail of the most recent payslip (for the summary + breakdown + timeline). */
  latest: PayslipDetail | null;
  latestTimeline: EmployeePayrollTimeline | null;
  payslips: PayslipListItem[];
  salaryStructure: EmployeeSalaryStructure | null;
  bank: EmployeePayrollBankDetails | null;
  bonuses: BonusItem[];
  reimbursements: ReimbursementItem[];
  trend: EmployeePayrollTrendPoint[];
  ytd: {
    earnings: number;
    deductions: number;
    net: number;
    tax: number;
    monthsCount: number;
    financialYearLabel: string;
  };
};
