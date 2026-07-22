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

export const payrollApprovalSchema = z.object({
  payrollId: z.string().uuid(),
  comments: z.string().trim().max(500).optional(),
});

export const payrollRejectSchema = z.object({
  payrollId: z.string().uuid(),
  comments: z.string().trim().min(1).max(500),
});

const salaryComponentSchema = z.object({
  specialAllowance: z.coerce.number().min(0).default(0),
  medical: z.coerce.number().min(0).default(0),
  pf: z.coerce.number().min(0).default(0),
  esi: z.coerce.number().min(0).default(0),
  professionalTax: z.coerce.number().min(0).default(0),
  incomeTax: z.coerce.number().min(0).default(0),
  other: z.coerce.number().min(0).default(0),
});

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

export const salaryStructureFormSchema = z
  .object({
    employeeId: z.string().uuid(),
    effectiveFrom: z.string().min(1),
    effectiveTo: z.string().optional(),
    currencyCode: z.string().length(3).default("INR"),
    basicSalary: z.coerce.number().min(0),
    hraAmount: z.coerce.number().min(0).default(0),
    transportAllowance: z.coerce.number().min(0).default(0),
    otherAllowances: z.coerce.number().min(0).default(0),
    components: salaryComponentSchema.optional(),
  })
  .transform((data) => {
    const components = resolveSalaryComponents(data.components);
    const specialAllowance = components.specialAllowance;
    const medical = components.medical;
    const grossSalary =
      data.basicSalary +
      data.hraAmount +
      data.transportAllowance +
      data.otherAllowances +
      specialAllowance +
      medical;
    const pf = components.pf;
    const esi = components.esi;
    const professionalTax = components.professionalTax;
    const incomeTax = components.incomeTax;
    const otherDeductions = components.other;
    const taxDeduction = incomeTax;
    const totalStatutory = pf + esi + professionalTax + otherDeductions;
    const netSalary = grossSalary - taxDeduction - totalStatutory;

    return {
      ...data,
      otherAllowances: data.otherAllowances + specialAllowance + medical,
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
    const components = resolveSalaryComponents(data.components);
    const specialAllowance = components.specialAllowance;
    const medical = components.medical;
    const grossSalary =
      data.basicSalary +
      data.hraAmount +
      data.transportAllowance +
      data.otherAllowances +
      specialAllowance +
      medical;
    const pf = components.pf;
    const esi = components.esi;
    const professionalTax = components.professionalTax;
    const incomeTax = components.incomeTax;
    const otherDeductions = components.other;
    const taxDeduction = incomeTax;
    const totalStatutory = pf + esi + professionalTax + otherDeductions;
    const netSalary = grossSalary - taxDeduction - totalStatutory;

    return {
      ...data,
      otherAllowances: data.otherAllowances + specialAllowance + medical,
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
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  employeeId: z.string().uuid().optional(),
});

export type PayrollRunInput = z.infer<typeof payrollRunSchema>;
export type SalaryStructureFormInput = z.input<typeof salaryStructureFormSchema>;
export type BonusFormInput = z.infer<typeof bonusFormSchema>;
export type ReimbursementFormInput = z.infer<typeof reimbursementFormSchema>;
export type SalaryRevisionFormInput = z.input<typeof salaryRevisionFormSchema>;
