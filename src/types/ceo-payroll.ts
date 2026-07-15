import type { LookupOption } from "@/types/employee";
import type { PayrollStatus } from "@/types/payroll";

export type CeoPayrollListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  month?: number;
  year?: number;
  departmentId?: string;
  employmentTypeId?: string;
  payrollStatus?: PayrollStatus;
};

export type CeoPayrollKpis = {
  totalPayrollCost: number;
  currentMonthPayroll: number;
  payrollProcessed: number;
  pendingPayroll: number;
  averageEmployeeSalary: number;
  benefitsCost: number;
  bonusCost: number;
  deductions: number;
  upcomingPayrollDate: string | null;
  payrollStatus: PayrollStatus | null;
  payrollStatusLabel: string;
};

export type CeoPayrollOverview = {
  monthlyLabel: string;
  totalSalaryExpense: number;
  benefitsExpense: number;
  bonusExpense: number;
  deductions: number;
  netPayroll: number;
  payrollCompletionPercent: number;
  monthlySummary: { label: string; value: number }[];
};

export type CeoPayrollEmployeeRow = {
  id: string;
  payrollItemId: string | null;
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  departmentName: string | null;
  designationTitle: string | null;
  basicSalary: number;
  allowances: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  payrollStatus: PayrollStatus | null;
  paymentDate: string | null;
};

export type CeoPayrollEmployeeListResult = {
  data: CeoPayrollEmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type CeoPayrollAnalytics = {
  monthlyTrend: { label: string; value: number }[];
  departmentCost: { label: string; value: number }[];
  salaryDistribution: { label: string; value: number }[];
  benefitsDistribution: { label: string; value: number }[];
  bonusDistribution: { label: string; value: number }[];
  payrollGrowth: { label: string; value: number }[];
  averageSalaryByDepartment: { label: string; value: number }[];
  costPerEmployee: number;
  comparison: { label: string; value: number }[];
};

export type CeoPayrollDepartmentRow = {
  id: string;
  name: string;
  employeeCount: number;
  monthlyCost: number;
  averageSalary: number;
  benefitsCost: number;
  bonusCost: number;
  payrollStatus: PayrollStatus | null;
};

export type CeoPayrollHistoryRow = {
  id: string;
  payrollMonth: string;
  monthLabel: string;
  payrollCost: number;
  employeesPaid: number;
  completedDate: string | null;
  status: PayrollStatus;
  month: number;
  year: number;
};

export type CeoPayrollInsights = {
  highestPayrollDepartment: { label: string; value: number } | null;
  lowestPayrollDepartment: { label: string; value: number } | null;
  payrollGrowthPercent: number;
  salaryIncreaseSummary: { label: string; value: number }[];
  bonusSummary: { label: string; value: number }[];
  upcomingPayrollRun: string | null;
  costOptimizationInsights: string[];
};

export type CeoPayrollFilterLookups = {
  departments: LookupOption[];
  employmentTypes: LookupOption[];
};

export type CeoPayrollEmployeeDetail = {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  departmentName: string | null;
  designationTitle: string | null;
  profileImagePath: string | null;
  payrollStatus: PayrollStatus | null;
  paymentDate: string | null;
  basicSalary: number;
  allowances: number;
  bonuses: number;
  incentives: number;
  deductions: number;
  tax: number;
  pf: number;
  esi: number;
  netSalary: number;
  salaryBreakdown: { label: string; amount: number; type: "earning" | "deduction" }[];
  paymentHistory: {
    id: string;
    monthLabel: string;
    netSalary: number;
    status: PayrollStatus;
    paymentDate: string | null;
  }[];
  timeline: { id: string; title: string; description: string | null; createdAt: string }[];
  lastSalaryRevision: {
    effectiveFrom: string;
    oldGross: number;
    newGross: number;
    status: string;
  } | null;
};

export type CeoPayrollPageData = {
  kpis: CeoPayrollKpis;
  overview: CeoPayrollOverview;
  employees: CeoPayrollEmployeeListResult;
  analytics: CeoPayrollAnalytics;
  departments: CeoPayrollDepartmentRow[];
  history: CeoPayrollHistoryRow[];
  insights: CeoPayrollInsights;
  lookups: CeoPayrollFilterLookups;
};
