export type PayrollCycle = "monthly" | "semi_monthly" | "weekly";
export type WorkingDaysCalculation = "calendar_days" | "working_days" | "fixed_30";
export type ApprovalWorkflowRole = "hr" | "finance" | "super_admin";

export type PayrollSettingsData = {
  payrollCycle: PayrollCycle;
  payrollProcessingDay: string;
  salaryCreditDate: number;
  financialYearStartMonth: number;
  financialYearEndMonth: number;
  currency: string;
  workingDaysCalculation: WorkingDaysCalculation;
  attendanceRules: {
    minimumWorkingHours: number;
    halfDayThreshold: number;
    lateMarkThreshold: string;
    overtimeCalculation: boolean;
    autoCalculateAttendance: boolean;
    ignoreWeekends: boolean;
    ignoreCompanyHolidays: boolean;
  };
  leaveIntegration: {
    paidLeaveDeduction: boolean;
    lossOfPayDeduction: boolean;
    halfDayDeduction: boolean;
    sandwichLeavePolicy: boolean;
    includeHolidaysInLeave: boolean;
  };
  salaryComponents: {
    basic: boolean;
    hra: boolean;
    specialAllowance: boolean;
    medical: boolean;
    travel: boolean;
    pf: boolean;
    esi: boolean;
    professionalTax: boolean;
    incomeTax: boolean;
    bonus: boolean;
    reimbursement: boolean;
    otherDeduction: boolean;
  };
  approvalWorkflow: ApprovalWorkflowRole[];
  payslip: {
    companyLogoPath: string | null;
    companyName: string;
    footerMessage: string;
    authorizedSignature: string | null;
    autoEmailPayslips: boolean;
    generatePdfAutomatically: boolean;
  };
  notifications: {
    notifyEmployee: boolean;
    notifyFinance: boolean;
    notifyHr: boolean;
    emailPayslip: boolean;
    reminderBeforePayrollRun: boolean;
  };
  payrollLock: {
    lockAfterApproval: boolean;
    allowReopening: boolean;
    requireApprovalBeforeUnlock: boolean;
  };
};

export type PayrollSettingsAudit = {
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  updatedByName: string | null;
};

export type PayrollSettingsRecord = {
  settings: PayrollSettingsData;
  audit: PayrollSettingsAudit;
};
