import { addMonths, format } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getPayslipById } from "@/lib/payroll/services/payroll-mutations";
import { listBonuses, listReimbursements } from "@/lib/payroll/services/payroll-queries";
import { getPayrollSettings } from "@/lib/payroll/services/payroll-settings";
import { maskAccountNumber } from "@/lib/payroll/services/payroll-utils";
import type { UserProfile } from "@/types/auth";
import type {
  EmployeePayrollData,
  EmployeePayrollTimeline,
  EmployeeSalaryStructure,
} from "@/types/employee-payroll";
import type {
  BonusItem,
  PayrollBreakdown,
  PayrollBreakdownLine,
  PayrollStatus,
  PayslipListItem,
  ReimbursementItem,
} from "@/types/payroll";

async function safe<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error("[employee-payroll] query failed", error);
    return fallback;
  }
}

function isTaxLine(line: PayrollBreakdownLine): boolean {
  const haystack = `${line.code} ${line.label}`.toLowerCase();
  return (
    haystack.includes("tax") ||
    haystack.includes("tds") ||
    haystack.includes("professional")
  );
}

function sumTax(breakdown: PayrollBreakdown | null): number {
  if (!breakdown?.deductions) return 0;
  return breakdown.deductions
    .filter(isTaxLine)
    .reduce((total, line) => total + Number(line.amount || 0), 0);
}

/** Next occurrence of the configured salary credit day, from today. */
function computeNextSalaryDate(creditDay: number): string {
  const clamped = Math.min(Math.max(creditDay, 1), 28);
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), clamped);
  if (today.getDate() > clamped) {
    return format(addMonths(target, 1), "yyyy-MM-dd");
  }
  return format(target, "yyyy-MM-dd");
}

function buildStructureLines(row: {
  basic_salary: number;
  hra_amount: number;
  transport_allowance: number;
  other_allowances: number;
  tax_deduction: number;
  other_deductions: number;
  components: Record<string, number> | null;
}): { earnings: PayrollBreakdownLine[]; deductions: PayrollBreakdownLine[] } {
  const components = row.components ?? {};
  const earningCandidates: PayrollBreakdownLine[] = [
    { code: "basic", label: "Basic Salary", amount: Number(row.basic_salary), type: "earning" },
    { code: "hra", label: "HRA", amount: Number(row.hra_amount), type: "earning" },
    {
      code: "transport",
      label: "Transport Allowance",
      amount: Number(row.transport_allowance),
      type: "earning",
    },
    {
      code: "special",
      label: "Special Allowance",
      amount: Number(components.specialAllowance ?? 0),
      type: "earning",
    },
    {
      code: "medical",
      label: "Medical Allowance",
      amount: Number(components.medical ?? 0),
      type: "earning",
    },
    {
      code: "other_allowances",
      label: "Other Allowances",
      amount: Number(row.other_allowances),
      type: "earning",
    },
  ];

  const deductionCandidates: PayrollBreakdownLine[] = [
    {
      code: "professional_tax",
      label: "Professional Tax",
      amount: Number(components.professionalTax ?? 0),
      type: "deduction",
    },
    {
      code: "income_tax",
      label: "Income Tax (TDS)",
      amount: Number(components.incomeTax ?? 0),
      type: "deduction",
    },
    {
      code: "pf",
      label: "Provident Fund",
      amount: Number(components.pf ?? 0),
      type: "deduction",
    },
    { code: "esi", label: "ESI", amount: Number(components.esi ?? 0), type: "deduction" },
    {
      code: "other_deductions",
      label: "Other Deductions",
      amount: Number(row.other_deductions),
      type: "deduction",
    },
  ];

  const knownTaxTotal =
    Number(components.professionalTax ?? 0) + Number(components.incomeTax ?? 0);
  // If the structure only stores a lump tax_deduction (no component split), surface it.
  if (knownTaxTotal === 0 && Number(row.tax_deduction) > 0) {
    deductionCandidates.unshift({
      code: "tax",
      label: "Tax Deducted",
      amount: Number(row.tax_deduction),
      type: "deduction",
    });
  }

  return {
    earnings: earningCandidates.filter((line) => line.amount > 0),
    deductions: deductionCandidates.filter((line) => line.amount > 0),
  };
}

const TIMELINE_STATUS_ORDER: PayrollStatus[] = [
  "draft",
  "processing",
  "processed",
  "approved",
  "paid",
];

function buildTimeline(payroll: {
  payroll_status: PayrollStatus;
  created_at: string | null;
  processed_at: string | null;
  approved_at: string | null;
}): EmployeePayrollTimeline {
  const status = payroll.payroll_status;
  const rank = TIMELINE_STATUS_ORDER.indexOf(status);
  return {
    status,
    stages: [
      {
        key: "generated",
        label: "Payroll Generated",
        at: payroll.processed_at ?? payroll.created_at,
        done: rank >= TIMELINE_STATUS_ORDER.indexOf("processed"),
      },
      {
        key: "hr_approved",
        label: "Approved",
        at: payroll.approved_at,
        done: rank >= TIMELINE_STATUS_ORDER.indexOf("approved"),
      },
      {
        key: "released",
        label: "Salary Released",
        at: status === "paid" ? payroll.approved_at : null,
        done: status === "paid",
      },
      {
        key: "credited",
        label: "Credited to Bank",
        at: null,
        done: status === "paid",
      },
    ],
  };
}

export async function getEmployeePayrollData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<EmployeePayrollData> {
  const employeeId = profile.employee.id;
  const organizationId = profile.employee.organizationId;

  const [payslipRows, structureRow, bankRow, settings, bonusResult, reimbursementResult] =
    await Promise.all([
    safe(async () => {
      const { data, error } = await supabase
        .schema("hrms")
        .from("payslips")
        .select(
          `
            id,
            payslip_number,
            employee_id,
            issued_at,
            payroll_items:payroll_item_id (
              gross_salary,
              net_salary,
              total_deductions,
              breakdown
            ),
            payrolls:payroll_id (
              payroll_month,
              payroll_status,
              created_at,
              processed_at,
              approved_at
            )
          `,
        )
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .order("issued_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    }, [] as unknown[]),
    safe(async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .schema("hrms")
        .from("salary_structures")
        .select(
          "effective_from, effective_to, currency_code, basic_salary, hra_amount, transport_allowance, other_allowances, tax_deduction, other_deductions, gross_salary, net_salary, components",
        )
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .lte("effective_from", today)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }, null),
    safe(async () => {
      const { data, error } = await supabase
        .schema("hrms")
        .from("bank_accounts")
        .select(
          "bank_name, account_holder_name, account_number, ifsc_code, branch_name, account_type, is_primary",
        )
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }, null),
    safe(() => getPayrollSettings(supabase, organizationId), null),
    safe(
      () => listBonuses(supabase, profile, { employeeId, page: 1, pageSize: 12 }),
      { data: [] as BonusItem[], total: 0, page: 1, pageSize: 12 },
    ),
    safe(
      () =>
        listReimbursements(supabase, profile, { employeeId, page: 1, pageSize: 12 }),
      { data: [] as ReimbursementItem[], total: 0, page: 1, pageSize: 12 },
    ),
  ]);

  const bonuses = bonusResult.data;
  const reimbursements = reimbursementResult.data;

  type PayslipRow = {
    id: string;
    payslip_number: string;
    issued_at: string;
    payroll_items:
      | {
          gross_salary: number;
          net_salary: number;
          total_deductions: number;
          breakdown: PayrollBreakdown | null;
        }
      | Array<{
          gross_salary: number;
          net_salary: number;
          total_deductions: number;
          breakdown: PayrollBreakdown | null;
        }>
      | null;
    payrolls:
      | {
          payroll_month: string;
          payroll_status: PayrollStatus;
          created_at: string | null;
          processed_at: string | null;
          approved_at: string | null;
        }
      | Array<{
          payroll_month: string;
          payroll_status: PayrollStatus;
          created_at: string | null;
          processed_at: string | null;
          approved_at: string | null;
        }>
      | null;
  };

  const unwrap = <T>(value: T | T[] | null): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : value;

  const rows = (payslipRows as PayslipRow[]).map((row) => {
    const item = unwrap(row.payroll_items);
    const payroll = unwrap(row.payrolls);
    return { row, item, payroll };
  });

  const payslips: PayslipListItem[] = rows.map(({ row, item, payroll }) => ({
    id: row.id,
    payslipNumber: row.payslip_number,
    employeeId,
    employeeCode: profile.employee.employeeCode,
    employeeName: `${profile.employee.firstName} ${profile.employee.lastName}`.trim(),
    payrollMonth: payroll?.payroll_month ?? "",
    grossSalary: Number(item?.gross_salary ?? 0),
    netSalary: Number(item?.net_salary ?? 0),
    payrollStatus: payroll?.payroll_status ?? "draft",
    issuedAt: row.issued_at,
  }));

  const currencyCode = settings?.settings.currency ?? "INR";
  const creditDay = settings?.settings.salaryCreditDate ?? 1;
  const fyStartMonth = settings?.settings.financialYearStartMonth ?? 4;

  // Financial year window that contains today.
  const now = new Date();
  const fyStartYear =
    now.getMonth() + 1 >= fyStartMonth ? now.getFullYear() : now.getFullYear() - 1;
  const fyStart = new Date(fyStartYear, fyStartMonth - 1, 1);
  const fyEnd = addMonths(fyStart, 12);
  const financialYearLabel =
    fyStartMonth === 1
      ? `FY ${fyStartYear}`
      : `FY ${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")}`;

  let ytdEarnings = 0;
  let ytdDeductions = 0;
  let ytdNet = 0;
  let ytdTax = 0;
  let ytdMonths = 0;
  const trend: EmployeePayrollData["trend"] = [];

  for (const { item, payroll } of rows) {
    if (!payroll?.payroll_month) continue;
    const monthDate = new Date(payroll.payroll_month);
    if (monthDate >= fyStart && monthDate < fyEnd) {
      ytdEarnings += Number(item?.gross_salary ?? 0);
      ytdDeductions += Number(item?.total_deductions ?? 0);
      ytdNet += Number(item?.net_salary ?? 0);
      ytdTax += sumTax(item?.breakdown ?? null);
      ytdMonths += 1;
    }
    trend.push({
      month: payroll.payroll_month,
      label: format(monthDate, "MMM"),
      gross: Number(item?.gross_salary ?? 0),
      net: Number(item?.net_salary ?? 0),
    });
  }
  trend.reverse();

  const latestPaid = rows.find(({ payroll }) => payroll?.payroll_status === "paid");
  const latestRow = rows[0] ?? null;

  const latest = latestRow
    ? await safe(() => getPayslipById(supabase, profile, latestRow.row.id), null)
    : null;

  const latestTimeline = latestRow?.payroll
    ? buildTimeline(latestRow.payroll)
    : null;

  let salaryStructure: EmployeeSalaryStructure | null = null;
  if (structureRow) {
    const components = (structureRow.components as Record<string, number>) ?? {};
    const lines = buildStructureLines({
      basic_salary: structureRow.basic_salary,
      hra_amount: structureRow.hra_amount,
      transport_allowance: structureRow.transport_allowance,
      other_allowances: structureRow.other_allowances,
      tax_deduction: structureRow.tax_deduction,
      other_deductions: structureRow.other_deductions,
      components,
    });
    salaryStructure = {
      effectiveFrom: structureRow.effective_from,
      currencyCode: structureRow.currency_code,
      basicSalary: Number(structureRow.basic_salary),
      hraAmount: Number(structureRow.hra_amount),
      transportAllowance: Number(structureRow.transport_allowance),
      otherAllowances: Number(structureRow.other_allowances),
      taxDeduction: Number(structureRow.tax_deduction),
      otherDeductions: Number(structureRow.other_deductions),
      grossSalary: Number(structureRow.gross_salary),
      netSalary: Number(structureRow.net_salary),
      earnings: lines.earnings,
      deductions: lines.deductions,
    };
  }

  const bank = bankRow
    ? {
        bankName: bankRow.bank_name,
        accountHolderName: bankRow.account_holder_name,
        accountNumberMasked: maskAccountNumber(bankRow.account_number),
        ifscCode: bankRow.ifsc_code ?? null,
        branchName: bankRow.branch_name ?? null,
        accountType: bankRow.account_type,
      }
    : null;

  const currentNet = latest?.netSalary ?? salaryStructure?.netSalary ?? null;
  const currentGross = latest?.grossSalary ?? salaryStructure?.grossSalary ?? null;

  return {
    currencyCode,
    hasAnyData:
      payslips.length > 0 ||
      salaryStructure !== null ||
      bonuses.length > 0 ||
      reimbursements.length > 0,
    kpis: {
      currentNetSalary: currentNet,
      currentGrossSalary: currentGross,
      nextSalaryDate: computeNextSalaryDate(creditDay),
      lastPaymentDate: latestPaid?.row.issued_at ?? null,
      latestStatus: latestRow?.payroll?.payroll_status ?? null,
      ytdEarnings,
      ytdTax,
    },
    latest,
    latestTimeline,
    payslips,
    salaryStructure,
    bank,
    bonuses,
    reimbursements,
    trend,
    ytd: {
      earnings: ytdEarnings,
      deductions: ytdDeductions,
      net: ytdNet,
      tax: ytdTax,
      monthsCount: ytdMonths,
      financialYearLabel,
    },
  };
}
