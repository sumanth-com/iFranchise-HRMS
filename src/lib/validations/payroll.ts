import { z } from "zod";

const monthYearSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const payrollListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z
    .enum(["payroll_month", "payroll_status", "total_net", "created_at"])
    .default("payroll_month"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  payrollStatus: z
    .enum([
      "draft",
      "processing",
      "processed",
      "approved",
      "paid",
      "cancelled",
    ])
    .optional(),
  employeeId: z.string().uuid().optional(),
});

export const payrollRunSchema = monthYearSchema.extend({
  notes: z.string().trim().max(500).optional(),
});

export const employeePayrollBreakdownSchema = monthYearSchema.extend({
  employeeId: z.string().uuid(),
});

const nullableNonNegative = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  return value;
}, z.union([z.null(), z.coerce.number().min(0)]));

const nullableLopDays = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  return value;
}, z.union([z.null(), z.coerce.number().min(0).max(31)]));

export const payrollItemAdjustmentSchema = z.object({
  payrollItemId: z.string().uuid(),
  additionalEarnings: z.coerce.number().min(0).default(0),
  bonus: z.coerce.number().min(0).default(0),
  incentive: z.coerce.number().min(0).default(0),
  reimbursements: z.coerce.number().min(0).default(0),
  additionalDeductions: z.coerce.number().min(0).default(0),
  tdsOverride: nullableNonNegative,
  otherDeductionsOverride: nullableNonNegative,
  lopDaysOverride: nullableLopDays,
  confirmReopen: z.boolean().optional(),
});

export const sendEmployeePayslipSchema = z.object({
  payrollItemId: z.string().uuid(),
});

export const payrollApprovalSchema = z.object({
  payrollId: z.string().uuid(),
  comments: z.string().trim().max(500).optional(),
});

export const payrollRejectSchema = z.object({
  payrollId: z.string().uuid(),
  comments: z.string().trim().min(1).max(500),
});

const nonNegativeAmount = z.coerce
  .number()
  .refine((value) => Number.isFinite(value), "Enter a valid amount")
  .min(0, "Amount cannot be negative");

const salaryComponentSchema = z.object({
  specialAllowance: nonNegativeAmount.default(0),
  medical: nonNegativeAmount.default(0),
  pf: nonNegativeAmount.default(0),
  esi: nonNegativeAmount.default(0),
  professionalTax: nonNegativeAmount.default(0),
  incomeTax: nonNegativeAmount.default(0),
  other: nonNegativeAmount.default(0),
});

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function resolveSalaryComponents(
  components?: z.infer<typeof salaryComponentSchema>,
) {
  return {
    specialAllowance: components?.specialAllowance ?? 0,
    medical: components?.medical ?? 0,
    pf: components?.pf ?? 0,
    esi: components?.esi ?? 0,
    professionalTax: components?.professionalTax ?? 0,
    incomeTax: components?.incomeTax ?? 0,
    other: components?.other ?? 0,
  };
}

function settleSalaryTotals(data: {
  basicSalary: number;
  hraAmount: number;
  transportAllowance: number;
  otherAllowances: number;
  components?: z.infer<typeof salaryComponentSchema>;
}) {
  const components = resolveSalaryComponents(data.components);
  const specialAllowance = components.specialAllowance;
  const medical = components.medical;
  const otherAllowances = roundMoney(data.otherAllowances + specialAllowance + medical);
  const grossSalary = roundMoney(
    data.basicSalary + data.hraAmount + data.transportAllowance + otherAllowances,
  );
  const pf = components.pf;
  const esi = components.esi;
  const professionalTax = components.professionalTax;
  const incomeTax = components.incomeTax;
  const otherDeductions = components.other;
  const taxDeduction = incomeTax;
  const totalStatutory = roundMoney(pf + esi + professionalTax + otherDeductions);
  const netSalary = roundMoney(grossSalary - taxDeduction - totalStatutory);

  return {
    otherAllowances,
    taxDeduction,
    otherDeductions: totalStatutory,
    grossSalary,
    netSalary,
    components: {
      specialAllowance,
      medical,
      pf,
      esi,
      professionalTax,
      incomeTax,
      other: otherDeductions,
    },
  };
}

export const salaryStructureFormSchema = z
  .object({
    employeeId: z.string().uuid(),
    effectiveFrom: z.string().min(1),
    effectiveTo: z.string().optional(),
    employmentTypeId: z.preprocess(
      (value) => (value === "" || value == null ? undefined : value),
      z.string().uuid().optional(),
    ),
    currencyCode: z.string().length(3).default("INR"),
    basicSalary: nonNegativeAmount,
    hraAmount: nonNegativeAmount.default(0),
    transportAllowance: nonNegativeAmount.default(0),
    otherAllowances: nonNegativeAmount.default(0),
    components: salaryComponentSchema.optional(),
  })
  .refine((data) => data.basicSalary > 0, {
    message: "Monthly gross salary must be greater than zero",
    path: ["basicSalary"],
  })
  .transform((data) => {
    const settled = settleSalaryTotals(data);
    return {
      ...data,
      ...settled,
    };
  });

export const bonusFormSchema = z.object({
  employeeId: z.string().uuid(),
  bonusType: z.enum([
    "festival",
    "performance",
    "referral",
    "retention",
    "joining",
    "special",
    "annual",
    "other",
  ]),
  amount: z.coerce.number().positive(),
  bonusMonth: z.coerce.number().int().min(1).max(12),
  bonusYear: z.coerce.number().int().min(2000).max(2100),
  reason: z.string().trim().max(500).optional(),
  remarks: z.string().trim().max(500).optional(),
  attachmentPath: z.string().trim().max(500).optional(),
});

export const reimbursementFormSchema = z.object({
  employeeId: z.string().uuid(),
  category: z.enum(["travel", "food", "fuel", "internet", "laptop", "other"]),
  amount: z.coerce.number().positive(),
  expenseDate: z.string().min(1),
  description: z.string().trim().max(500).optional(),
});

export const salaryRevisionFormSchema = z
  .object({
    employeeId: z.string().uuid(),
    effectiveFrom: z.string().min(1),
    reason: z.string().trim().min(1).max(500),
    currencyCode: z.string().length(3).default("INR"),
    basicSalary: z.coerce.number().min(0),
    hraAmount: z.coerce.number().min(0).default(0),
    transportAllowance: z.coerce.number().min(0).default(0),
    otherAllowances: z.coerce.number().min(0).default(0),
    components: salaryComponentSchema.optional(),
  })
  .transform((data) => {
    const settled = settleSalaryTotals(data);
    return {
      ...data,
      ...settled,
    };
  });

export const payslipListParamsSchema = payrollListParamsSchema;

export const payslipHistoryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  search: z.string().trim().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  yearFilter: z.enum(["all", "current", "last"]).optional(),
  employeeId: z.string().uuid().optional(),
  includeArchived: z.coerce.boolean().optional().default(false),
  groupByYear: z.coerce.boolean().optional().default(true),
  payslipStatus: z.enum(["all", "pending", "sent"]).optional().default("all"),
});

export const bonusListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  bonusStatus: z
    .enum(["pending", "approved", "rejected", "paid", "cancelled"])
    .optional(),
  bonusType: z
    .enum([
      "festival",
      "performance",
      "referral",
      "retention",
      "joining",
      "special",
      "annual",
      "other",
    ])
    .optional(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

export const reimbursementListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  reimbursementStatus: z
    .enum(["pending", "approved", "rejected", "paid", "cancelled"])
    .optional(),
  category: z
    .enum(["travel", "food", "fuel", "internet", "laptop", "other"])
    .optional(),
  employeeId: z.string().uuid().optional(),
});

export const salaryRevisionListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  revisionStatus: z
    .enum(["pending", "approved", "rejected", "applied", "cancelled"])
    .optional(),
  employeeId: z.string().uuid().optional(),
});

export const salaryStructureListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(500),
  search: z.string().trim().optional(),
  employeeId: z.string().uuid().optional(),
});

export type PayrollRunInput = z.infer<typeof payrollRunSchema>;
export type SalaryStructureFormInput = z.input<typeof salaryStructureFormSchema>;
export type BonusFormInput = z.infer<typeof bonusFormSchema>;
export type ReimbursementFormInput = z.infer<typeof reimbursementFormSchema>;
export type SalaryRevisionFormInput = z.input<typeof salaryRevisionFormSchema>;
