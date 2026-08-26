import { addMonths, format } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  paymentStatusLabel,
} from "@/lib/payroll/services/payslip-history-queries";
import {
  PAYSLIP_PUBLISH_DAY,
  canAccessPayslipDuringReview,
  resolvePayslipAvailability,
  resolvePayslipSchedule,
  SALARY_CREDIT_DAY,
} from "@/lib/payroll/services/payslip-publication";
import { listBonuses, listReimbursements } from "@/lib/payroll/services/payroll-queries";
import { getPayrollSettings } from "@/lib/payroll/services/payroll-settings";
import { maskAccountNumber, roundCurrency, toEmployeeFacingEarnings } from "@/lib/payroll/services/payroll-utils";
import {
  BONUS_TYPE_LABELS,
  REIMBURSEMENT_CATEGORY_LABELS,
} from "@/lib/payroll/constants";
import type { UserProfile } from "@/types/auth";
import type {
  EmployeePayrollData,
  EmployeePayrollDisplaySummary,
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

const PAYABLE_EXTRA_STATUSES = new Set(["pending", "approved", "paid"]);

function monthKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length >= 7) return trimmed.slice(0, 7);
  return null;
}

function extraLineKey(code: string, amount: number) {
  return `${code}:${amount.toFixed(2)}`;
}

function countExtraKeys(lines: PayrollBreakdownLine[]) {
  const counts = new Map<string, number>();
  for (const line of lines) {
    if (!line.code.startsWith("bonus_") && !line.code.startsWith("reimb_")) continue;
    const key = extraLineKey(line.code, Number(line.amount));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function consumeExtraKey(counts: Map<string, number>, code: string, amount: number) {
  const key = extraLineKey(code, amount);
  const remaining = counts.get(key) ?? 0;
  if (remaining <= 0) return false;
  counts.set(key, remaining - 1);
  return true;
}

function extrasForMonth(
  bonuses: BonusItem[],
  reimbursements: ReimbursementItem[],
  period: string,
) {
  return {
    bonuses: bonuses.filter(
      (item) =>
        PAYABLE_EXTRA_STATUSES.has(item.bonusStatus) &&
        monthKey(item.bonusMonth) === period,
    ),
    reimbursements: reimbursements.filter(
      (item) =>
        PAYABLE_EXTRA_STATUSES.has(item.reimbursementStatus) &&
        monthKey(item.expenseDate) === period,
    ),
  };
}

function buildDisplaySummary(input: {
  latest: EmployeePayrollData["latest"];
  salaryStructure: EmployeeSalaryStructure | null;
  bonuses: BonusItem[];
  reimbursements: ReimbursementItem[];
}): EmployeePayrollDisplaySummary {
  const currentMonth = format(new Date(), "yyyy-MM");
  const latestMonth = monthKey(input.latest?.payrollMonth);
  const extraMonths = [
    ...input.bonuses
      .filter((item) => PAYABLE_EXTRA_STATUSES.has(item.bonusStatus))
      .map((item) => monthKey(item.bonusMonth)),
    ...input.reimbursements
      .filter((item) => PAYABLE_EXTRA_STATUSES.has(item.reimbursementStatus))
      .map((item) => monthKey(item.expenseDate)),
  ].filter((value): value is string => Boolean(value));

  const newestExtraMonth = extraMonths.sort().at(-1) ?? null;
  const periodMonth =
    extraMonths.includes(currentMonth)
      ? currentMonth
      : (newestExtraMonth ?? latestMonth ?? currentMonth);
  const useProjectedCurrent = Boolean(periodMonth && periodMonth !== latestMonth);
  const extras = extrasForMonth(input.bonuses, input.reimbursements, periodMonth);

  const structureAvailable = Boolean(input.salaryStructure);
  const usingStructure = useProjectedCurrent ? structureAvailable : !input.latest;

  const latestEarnings = input.latest?.breakdown?.earnings ?? [];
  const latestDeductions = input.latest?.breakdown?.deductions ?? [];
  const recurringEarnings = (useProjectedCurrent
    ? structureAvailable
      ? input.salaryStructure?.earnings ?? []
      : latestEarnings.filter(
          (line) =>
            !line.code.startsWith("bonus_") && !line.code.startsWith("reimb_"),
        )
    : usingStructure
      ? input.salaryStructure?.earnings ?? []
      : latestEarnings.length
        ? latestEarnings
        : (input.salaryStructure?.earnings ?? [])
  );

  const baseEarnings: PayrollBreakdownLine[] = [...recurringEarnings];
  const baseDeductions: PayrollBreakdownLine[] = [
    ...(useProjectedCurrent
      ? structureAvailable
        ? input.salaryStructure?.deductions ?? []
        : latestDeductions
      : usingStructure
        ? input.salaryStructure?.deductions ?? []
        : latestDeductions.length
          ? latestDeductions
          : (input.salaryStructure?.deductions ?? [])),
  ];

  const alreadyIncluded = usingStructure
    ? new Map<string, number>()
    : countExtraKeys(baseEarnings);

  const extraLines: PayrollBreakdownLine[] = [];

  for (const bonus of extras.bonuses) {
    const code = `bonus_${bonus.bonusType}`;
    const amount = roundCurrency(Number(bonus.amount));
    if (consumeExtraKey(alreadyIncluded, code, amount)) continue;
    extraLines.push({
      code,
      label: BONUS_TYPE_LABELS[bonus.bonusType] ?? `Bonus (${bonus.bonusType})`,
      amount,
      type: "earning",
    });
  }

  for (const claim of extras.reimbursements) {
    const code = `reimb_${claim.category}`;
    const amount = roundCurrency(Number(claim.amount));
    if (consumeExtraKey(alreadyIncluded, code, amount)) continue;
    extraLines.push({
      code,
      label: `${REIMBURSEMENT_CATEGORY_LABELS[claim.category] ?? claim.category} reimbursement`,
      amount,
      type: "earning",
    });
  }

  const earnings = [...baseEarnings, ...extraLines];
  const deductions = baseDeductions;
  const extraTotal = roundCurrency(
    extraLines.reduce((sum, line) => sum + line.amount, 0),
  );
  const baseGross = usingStructure
    ? Number(input.salaryStructure?.grossSalary ?? 0)
    : Number(input.latest?.grossSalary ?? input.salaryStructure?.grossSalary ?? 0);
  const baseDeductionsTotal = usingStructure
    ? roundCurrency(
        Number(input.salaryStructure?.grossSalary ?? 0) -
          Number(input.salaryStructure?.netSalary ?? 0),
      )
    : Number(
        input.latest?.totalDeductions ??
          (input.salaryStructure
            ? input.salaryStructure.grossSalary - input.salaryStructure.netSalary
            : 0),
      );
  const baseNet = usingStructure
    ? Number(input.salaryStructure?.netSalary ?? 0)
    : Number(input.latest?.netSalary ?? input.salaryStructure?.netSalary ?? 0);

  const grossSalary = roundCurrency(baseGross + extraTotal);
  const totalDeductions = roundCurrency(baseDeductionsTotal);
  const netSalary = roundCurrency(baseNet + extraTotal);

  return {
    earnings: toEmployeeFacingEarnings([...baseEarnings, ...extraLines]),
    deductions: deductions.filter((line) => Number(line.amount) > 0),
    grossSalary,
    totalDeductions,
    netSalary,
    periodMonth,
    usingStructure,
    extrasIncluded: extraLines.length > 0,
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
  options?: { targetEmployeeId?: string; appOrigin?: string },
): Promise<EmployeePayrollData> {
  const employeeId = options?.targetEmployeeId ?? profile.employee.id;
  const organizationId = profile.employee.organizationId;
  // Payslip publication is owned by /api/cron/publish-payslips — never kick off
  // org-wide sequential getPayslipById/PDF/email work on navigation paint.
  void options?.appOrigin;

  const employeeMeta =
    employeeId === profile.employee.id
      ? {
          employeeCode: profile.employee.employeeCode,
          firstName: profile.employee.firstName,
          lastName: profile.employee.lastName,
        }
      : await safe(async () => {
          const { data, error } = await supabase
            .schema("hrms")
            .from("employees")
            .select("employee_code, first_name, last_name")
            .eq("id", employeeId)
            .eq("organization_id", organizationId)
            .is("deleted_at", null)
            .maybeSingle();
          if (error) throw new Error(error.message);
          if (!data) throw new Error("Employee not found");
          return {
            employeeCode: data.employee_code as string,
            firstName: data.first_name as string,
            lastName: data.last_name as string,
          };
        }, {
          employeeCode: profile.employee.employeeCode,
          firstName: profile.employee.firstName,
          lastName: profile.employee.lastName,
        });

  const viewingOwnPayroll = employeeId === profile.employee.id;
  const hrPayslipAccess =
    !viewingOwnPayroll && canAccessPayslipDuringReview(profile.permissionCodes);

  const [payslipRows, structureRow, bankRow, settings, bonusResult, reimbursementResult, pendingPromotionRow] =
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
            salary_credit_date,
            published_at,
            payslip_version,
            archived_at,
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
        .eq("is_current", true)
        .is("archived_at", null)
        .is("deleted_at", null)
        .order("issued_at", { ascending: false })
        // Hub only needs recent slips for KPIs/list; full history loads via dialog action.
        .limit(24);
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
    safe(async () => {
      const { data, error } = await supabase
        .schema("hrms")
        .from("performance_promotions")
        .select(
          `promotion_status, current_salary, recommended_salary,
           recommended_designation:recommended_designation_id(title)`,
        )
        .eq("organization_id", organizationId)
        .eq("employee_id", employeeId)
        .in("promotion_status", ["pending", "recommended"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }, null),
  ]);

  const bonuses = bonusResult.data;
  const reimbursements = reimbursementResult.data;

  type PayslipRow = {
    id: string;
    payslip_number: string;
    issued_at: string;
    salary_credit_date: string | null;
    published_at: string | null;
    payslip_version: string | null;
    archived_at: string | null;
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

  const currencyCode = settings?.settings.currency ?? "INR";
  const creditDay = settings?.settings.salaryCreditDate ?? SALARY_CREDIT_DAY;
  const publishDay = settings?.settings.payslipAvailableDay ?? PAYSLIP_PUBLISH_DAY;
  const fyStartMonth = settings?.settings.financialYearStartMonth ?? 4;
  const scheduleOptions = {
    salaryCreditDay: creditDay,
    publishDay,
  };

  const payslips: PayslipListItem[] = rows.map(({ row, item, payroll }) => {
    const schedule = resolvePayslipSchedule(
      payroll?.payroll_month ?? "",
      {
        salaryCreditDate: row.salary_credit_date ?? undefined,
        publishedAt: row.published_at ?? undefined,
      },
      scheduleOptions,
    );
    const access = resolvePayslipAvailability(
      schedule.publishedAt,
      profile.permissionCodes,
      new Date(),
      { employeeFacing: viewingOwnPayroll },
    );
    return {
      id: row.id,
      payslipNumber: row.payslip_number,
      employeeId,
      employeeCode: employeeMeta.employeeCode,
      employeeName: `${employeeMeta.firstName} ${employeeMeta.lastName}`.trim(),
      payrollMonth: payroll?.payroll_month ?? "",
      grossSalary: Number(item?.gross_salary ?? 0),
      netSalary: Number(item?.net_salary ?? 0),
      payrollStatus: payroll?.payroll_status ?? "draft",
      issuedAt: row.issued_at,
      salaryCreditDate: schedule.salaryCreditDate,
      publishedAt: schedule.publishedAt,
      availability: access.availability,
      canEmployeeAccess: access.canEmployeeAccess,
      reviewMessage: access.reviewMessage,
      payslipVersion: row.payslip_version ?? "1.0",
      paymentStatus: paymentStatusLabel(
        payroll?.payroll_status ?? "draft",
        access.availability,
      ),
      isArchived: Boolean(row.archived_at),
      versionCount: 1,
    };
  });

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

  const latestAccessible = rows.find(({ row, payroll }) => {
    const schedule = resolvePayslipSchedule(
      payroll?.payroll_month ?? "",
      {
        salaryCreditDate: row.salary_credit_date ?? undefined,
        publishedAt: row.published_at ?? undefined,
      },
      scheduleOptions,
    );
    const access = resolvePayslipAvailability(
      schedule.publishedAt,
      profile.permissionCodes,
      new Date(),
      { employeeFacing: viewingOwnPayroll },
    );
    return access.canEmployeeAccess || hrPayslipAccess;
  });

  // Build latest detail from the already-fetched list row (includes breakdown).
  // Avoids a sequential getPayslipById + logo signing on first paint; PDF download
  // still uses the dedicated API path when the user requests it.
  const latest = (() => {
    if (!latestAccessible) return null;
    const { row, item, payroll } = latestAccessible;
    const schedule = resolvePayslipSchedule(
      payroll?.payroll_month ?? "",
      {
        salaryCreditDate: row.salary_credit_date ?? undefined,
        publishedAt: row.published_at ?? undefined,
      },
      scheduleOptions,
    );
    const access = resolvePayslipAvailability(
      schedule.publishedAt,
      profile.permissionCodes,
      new Date(),
      { employeeFacing: viewingOwnPayroll },
    );
    const breakdown = (item?.breakdown ?? {
      earnings: [],
      deductions: [],
      attendance: {
        workingDays: 0,
        presentDays: 0,
        absentDays: 0,
        lopDays: 0,
        leaveLopDays: 0,
        overtimeHours: 0,
      },
    }) as PayrollBreakdown;
    return {
      id: row.id,
      payslipNumber: row.payslip_number,
      issuedAt: row.issued_at,
      payrollMonth: payroll?.payroll_month ?? "",
      payrollStatus: payroll?.payroll_status ?? "draft",
      salaryCreditDate: schedule.salaryCreditDate,
      publishedAt: schedule.publishedAt,
      payrollGeneratedAt: payroll?.created_at ?? row.issued_at,
      paymentMode: "bank_transfer",
      transactionReference: null,
      payslipVersion: row.payslip_version ?? "1.0",
      availability: access.availability,
      canEmployeeAccess: access.canEmployeeAccess,
      reviewMessage: access.reviewMessage,
      employee: {
        id: employeeId,
        employeeCode: employeeMeta.employeeCode,
        firstName: employeeMeta.firstName,
        lastName: employeeMeta.lastName,
        email: profile.employee.email ?? "",
        departmentName: null,
        designationTitle: null,
        employmentType: null,
        branchName: null,
        dateOfJoining: null,
        pan: null,
        uan: null,
        pfNumber: null,
      },
      organization: {
        name: "",
        addressLines: [],
        logoUrl: null,
        email: null,
        phone: null,
        footerMessage: "",
        gstNumber: null,
        cin: null,
      },
      currencyCode,
      basicSalary: 0,
      totalAllowances: 0,
      totalDeductions: Number(item?.total_deductions ?? 0),
      grossSalary: Number(item?.gross_salary ?? 0),
      netSalary: Number(item?.net_salary ?? 0),
      totalEarnings: Number(item?.gross_salary ?? 0),
      employerContributionTotal: 0,
      breakdown,
      employerContributions: [],
      bankAccount: null,
      storagePath: null,
    } satisfies NonNullable<EmployeePayrollData["latest"]>;
  })();

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

  const displaySummary = buildDisplaySummary({
    latest,
    salaryStructure,
    bonuses,
    reimbursements,
  });

  const currentNet = displaySummary.netSalary;
  const currentGross = displaySummary.grossSalary;

  const recommendedDesignation = pendingPromotionRow?.recommended_designation as
    | { title: string }
    | { title: string }[]
    | null;
  const designationTitle = Array.isArray(recommendedDesignation)
    ? recommendedDesignation[0]?.title
    : recommendedDesignation?.title;

  const pendingPromotion = pendingPromotionRow
    ? {
        status: String(pendingPromotionRow.promotion_status),
        currentSalary:
          pendingPromotionRow.current_salary != null
            ? Number(pendingPromotionRow.current_salary)
            : null,
        recommendedSalary:
          pendingPromotionRow.recommended_salary != null
            ? Number(pendingPromotionRow.recommended_salary)
            : null,
        recommendedDesignation: designationTitle ?? null,
      }
    : null;

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
    displaySummary,
    trend,
    pendingPromotion,
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
