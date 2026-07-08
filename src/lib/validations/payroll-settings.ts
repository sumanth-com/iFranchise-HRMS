import { z } from "zod";

const approvalWorkflowRoleSchema = z.enum(["hr", "finance", "super_admin"]);

export const payrollSettingsSchema = z.object({
  payrollCycle: z.enum(["monthly", "semi_monthly", "weekly"]),
  payrollProcessingDay: z.string().min(1).max(50),
  salaryCreditDate: z.coerce.number().int().min(1).max(31),
  financialYearStartMonth: z.coerce.number().int().min(1).max(12),
  financialYearEndMonth: z.coerce.number().int().min(1).max(12),
  currency: z.string().length(3),
  workingDaysCalculation: z.enum(["calendar_days", "working_days", "fixed_30"]),
  attendanceRules: z.object({
    minimumWorkingHours: z.coerce.number().min(0).max(24),
    halfDayThreshold: z.coerce.number().min(0).max(24),
    lateMarkThreshold: z.string().min(1).max(10),
    overtimeCalculation: z.boolean(),
    autoCalculateAttendance: z.boolean(),
    ignoreWeekends: z.boolean(),
    ignoreCompanyHolidays: z.boolean(),
  }),
  leaveIntegration: z.object({
    paidLeaveDeduction: z.boolean(),
    lossOfPayDeduction: z.boolean(),
    halfDayDeduction: z.boolean(),
    sandwichLeavePolicy: z.boolean(),
    includeHolidaysInLeave: z.boolean(),
  }),
  salaryComponents: z.object({
    basic: z.boolean(),
    hra: z.boolean(),
    specialAllowance: z.boolean(),
    medical: z.boolean(),
    travel: z.boolean(),
    pf: z.boolean(),
    esi: z.boolean(),
    professionalTax: z.boolean(),
    incomeTax: z.boolean(),
    bonus: z.boolean(),
    reimbursement: z.boolean(),
    otherDeduction: z.boolean(),
  }),
  approvalWorkflow: z
    .array(approvalWorkflowRoleSchema)
    .min(1)
    .max(5),
  payslip: z.object({
    companyLogoPath: z.string().nullable(),
    companyName: z.string().min(1).max(200),
    footerMessage: z.string().max(500),
    authorizedSignature: z.string().nullable(),
    autoEmailPayslips: z.boolean(),
    generatePdfAutomatically: z.boolean(),
  }),
  notifications: z.object({
    notifyEmployee: z.boolean(),
    notifyFinance: z.boolean(),
    notifyHr: z.boolean(),
    emailPayslip: z.boolean(),
    reminderBeforePayrollRun: z.boolean(),
  }),
  payrollLock: z.object({
    lockAfterApproval: z.boolean(),
    allowReopening: z.boolean(),
    requireApprovalBeforeUnlock: z.boolean(),
  }),
});

export type PayrollSettingsFormInput = z.input<typeof payrollSettingsSchema>;
export type PayrollSettingsFormValues = z.output<typeof payrollSettingsSchema>;
/** @deprecated Use PayrollSettingsFormValues */
export type PayrollSettingsInput = PayrollSettingsFormValues;
