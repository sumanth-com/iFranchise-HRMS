import { addMonths, format } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  paymentStatusLabel,
} from "@/lib/payroll/services/payslip-history-queries";
import {
  PAYSLIP_PUBLISH_DAY,
  canAccessPayslipDuringReview,
  computeSalaryCreditDate,
  resolveEmployeePayslipReleaseAt,
  resolvePayslipAvailability,
  resolvePayslipSchedule,
  SALARY_CREDIT_DAY,
} from "@/lib/payroll/services/payslip-publication";
import {
  buildStandardEarningsLines,
  resolveSalaryBreakdownFromStructure,
} from "@/lib/payroll/salary-structure-breakdown";
import { listBonuses, listReimbursements } from "@/lib/payroll/services/payroll-queries";
import { getPayrollSettings } from "@/lib/payroll/services/payroll-settings";
import { maskAccountNumber, getPayslipDeductionLines, getPayslipEarningsLines, displaySalaryBankDetails, parsePayrollMonthFromPayslipNumber, payrollMonthSortKey, comparePayrollMonthsDesc } from "@/lib/payroll/services/payroll-utils";
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
  gross_salary?: number;
  tax_deduction: number;
  other_deductions: number;
  components: Record<string, number> | null;
}): { earnings: PayrollBreakdownLine[]; deductions: PayrollBreakdownLine[] } {
  const components = row.components ?? {};
  const split = resolveSalaryBreakdownFromStructure({
    gross_salary: row.gross_salary,
    basic_salary: row.basic_salary,
    hra_amount: row.hra_amount,
    transport_allowance: row.transport_allowance,
    other_allowances: row.other_allowances,
    components,
  });
  const earningCandidates = buildStandardEarningsLines(split);

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

function buildPublishedPayslipDisplaySummary(
  latest: NonNullable<EmployeePayrollData["latest"]>,
): EmployeePayrollDisplaySummary {
  const breakdown = latest.breakdown;
  const grossSalary = latest.grossSalary;
  const totalDeductions = latest.totalDeductions;
  const netSalary = latest.netSalary;

  return {
    earnings: getPayslipEarningsLines({
      earnings: breakdown.earnings,
      basicSalary: latest.basicSalary,
      totalAllowances: latest.totalAllowances,
      grossSalary,
    }),
    deductions: getPayslipDeductionLines(breakdown.deductions),
    grossSalary,
    totalDeductions,
    netSalary,
    periodMonth: latest.payrollMonth.slice(0, 7),
    usingStructure: false,
    extrasIncluded: false,
  };
}

const TIMELINE_STATUS_ORDER: PayrollStatus[] = [
  "draft",
  "processing",
  "processed",
  "approved",
  "paid",
];

function effectivePayslipReleaseAt(
  emailSentAt: string | null,
  breakdown: PayrollBreakdown | null | undefined,
): string | null {
  return resolveEmployeePayslipReleaseAt({
    emailSentAt,
    payrollLifecycle: breakdown?.payrollLifecycle,
  });
}

function resolveRowPayrollMonth(
  payrollMonth: string | null | undefined,
  payslipNumber: string,
): string {
  const trimmed = payrollMonth?.trim();
  if (trimmed) return trimmed;
  return parsePayrollMonthFromPayslipNumber(payslipNumber) ?? "";
}

/** One released payslip per payroll month — prefer HR-sent over draft duplicates. */
function dedupePayslipsByMonth(items: PayslipListItem[]): PayslipListItem[] {
  const byMonth = new Map<string, PayslipListItem>();
  for (const item of items) {
    const key =
      payrollMonthSortKey(item.payrollMonth) ||
      parsePayrollMonthFromPayslipNumber(item.payslipNumber) ||
      item.id;
    const existing = byMonth.get(key);
    if (!existing) {
      byMonth.set(key, item);
      continue;
    }
    const itemReleased = item.canEmployeeAccess ? 1 : 0;
    const existingReleased = existing.canEmployeeAccess ? 1 : 0;
    if (itemReleased > existingReleased) {
      byMonth.set(key, item);
      continue;
    }
    if (itemReleased === existingReleased && item.issuedAt > existing.issuedAt) {
      byMonth.set(key, item);
    }
  }
  return [...byMonth.values()].sort((a, b) =>
    comparePayrollMonthsDesc(a.payrollMonth, b.payrollMonth),
  );
}

function buildTimeline(input: {
  payroll: {
    payroll_status: PayrollStatus;
    created_at: string | null;
    processed_at: string | null;
    approved_at: string | null;
  };
  emailSentAt: string | null;
  publishedAt: string;
  salaryCreditDate: string;
  payrollLifecycle?: PayrollBreakdown["payrollLifecycle"];
}): EmployeePayrollTimeline {
  const status = input.payroll.payroll_status;
  const rank = TIMELINE_STATUS_ORDER.indexOf(status);
  const releaseAt = resolveEmployeePayslipReleaseAt({
    emailSentAt: input.emailSentAt,
    payrollLifecycle: input.payrollLifecycle,
  });
  const payslipReleased = Boolean(releaseAt);

  return {
    status,
    stages: [
      {
        key: "generated",
        label: "Payroll Generated",
        description: "Payroll calculation created by HR.",
        at: input.payroll.processed_at ?? input.payroll.created_at,
        done: rank >= TIMELINE_STATUS_ORDER.indexOf("processed"),
      },
      {
        key: "hr_approved",
        label: "Payroll Reviewed",
        description: "Payroll reviewed and approved.",
        at: input.payroll.approved_at,
        done: rank >= TIMELINE_STATUS_ORDER.indexOf("approved"),
      },
      {
        key: "released",
        label: "Payslip Sent",
        description: "Payslip successfully published/sent to the employee.",
        at: releaseAt ?? (payslipReleased ? input.publishedAt : null),
        done: payslipReleased,
      },
      {
        key: "credited",
        label: "Salary Credited",
        description: "Salary payment marked as credited.",
        at: status === "paid" ? input.salaryCreditDate : null,
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
            payroll_id,
            issued_at,
            salary_credit_date,
            published_at,
            email_sent_at,
            payslip_version,
            archived_at,
            payroll_items:payroll_item_id (
              gross_salary,
              net_salary,
              total_deductions,
              basic_salary,
              total_allowances,
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
        .limit(500);
      if (error) throw new Error(error.message);
      const sorted = (data ?? []).sort((a, b) => {
        const aPayroll = Array.isArray(a.payrolls) ? a.payrolls[0] : a.payrolls;
        const bPayroll = Array.isArray(b.payrolls) ? b.payrolls[0] : b.payrolls;
        const aMonth =
          resolveRowPayrollMonth(
            (aPayroll as { payroll_month?: string } | null)?.payroll_month,
            String(a.payslip_number),
          );
        const bMonth =
          resolveRowPayrollMonth(
            (bPayroll as { payroll_month?: string } | null)?.payroll_month,
            String(b.payslip_number),
          );
        return comparePayrollMonthsDesc(aMonth, bMonth);
      });
      return sorted;
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
        .order("updated_at", { ascending: false })
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
    email_sent_at: string | null;
    payslip_version: string | null;
    archived_at: string | null;
    payroll_items:
      | {
          gross_salary: number;
          net_salary: number;
          total_deductions: number;
          basic_salary: number;
          total_allowances: number;
          breakdown: PayrollBreakdown | null;
        }
      | Array<{
          gross_salary: number;
          net_salary: number;
          total_deductions: number;
          basic_salary: number;
          total_allowances: number;
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
    const releaseAt = effectivePayslipReleaseAt(row.email_sent_at, item?.breakdown ?? null);
    const access = resolvePayslipAvailability(
      schedule.publishedAt,
      profile.permissionCodes,
      new Date(),
      {
        employeeFacing: viewingOwnPayroll,
        emailSentAt: releaseAt,
      },
    );
    return {
      id: row.id,
      payslipNumber: row.payslip_number,
      employeeId,
      employeeCode: employeeMeta.employeeCode,
      employeeName: `${employeeMeta.firstName} ${employeeMeta.lastName}`.trim(),
      payrollMonth: resolveRowPayrollMonth(payroll?.payroll_month, row.payslip_number),
      grossSalary: Number(item?.gross_salary ?? 0),
      netSalary: Number(item?.net_salary ?? 0),
      payrollStatus: payroll?.payroll_status ?? "draft",
      issuedAt: row.issued_at,
      emailSentAt: releaseAt,
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

  const mappedPayslips = payslips;
  const payslipsForEmployee = viewingOwnPayroll
    ? dedupePayslipsByMonth(mappedPayslips.filter((row) => row.canEmployeeAccess))
    : dedupePayslipsByMonth(mappedPayslips);

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

  for (const { row, item, payroll } of rows) {
    const payrollMonth = resolveRowPayrollMonth(payroll?.payroll_month, row.payslip_number);
    if (!payrollMonth) continue;
    const schedule = resolvePayslipSchedule(
      payrollMonth,
      {
        salaryCreditDate: row.salary_credit_date ?? undefined,
        publishedAt: row.published_at ?? undefined,
      },
      scheduleOptions,
    );
    const released = viewingOwnPayroll
      ? Boolean(
          effectivePayslipReleaseAt(row.email_sent_at, item?.breakdown ?? null),
        )
      : true;
    if (!released && !hrPayslipAccess) continue;

    const monthDate = new Date(payrollMonth);
    if (monthDate >= fyStart && monthDate < fyEnd) {
      ytdEarnings += Number(item?.gross_salary ?? 0);
      ytdDeductions += Number(item?.total_deductions ?? 0);
      ytdNet += Number(item?.net_salary ?? 0);
      ytdTax += sumTax(item?.breakdown ?? null);
      ytdMonths += 1;
    }
    trend.push({
      month: payrollMonth,
      label: format(monthDate, "MMM"),
      gross: Number(item?.gross_salary ?? 0),
      net: Number(item?.net_salary ?? 0),
    });
  }
  trend.reverse();

  const latestAccessible = [...rows]
    .sort(({ row: rowA, payroll: payrollA }, { row: rowB, payroll: payrollB }) =>
      comparePayrollMonthsDesc(
        resolveRowPayrollMonth(payrollA?.payroll_month, rowA.payslip_number),
        resolveRowPayrollMonth(payrollB?.payroll_month, rowB.payslip_number),
      ),
    )
    .find(({ row, item, payroll }) => {
    const payrollMonth = resolveRowPayrollMonth(payroll?.payroll_month, row.payslip_number);
    const schedule = resolvePayslipSchedule(
      payrollMonth,
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
      {
        employeeFacing: viewingOwnPayroll,
        emailSentAt: effectivePayslipReleaseAt(row.email_sent_at, item?.breakdown ?? null),
      },
    );
    return access.canEmployeeAccess || hrPayslipAccess;
  });

  const publishedMonthKey = latestAccessible
    ? payrollMonthSortKey(
        resolveRowPayrollMonth(
          latestAccessible.payroll?.payroll_month,
          latestAccessible.row.payslip_number,
        ),
      ) || null
    : null;
  const scopedBonuses =
    viewingOwnPayroll && publishedMonthKey
      ? bonuses.filter((bonus) => bonus.bonusMonth.slice(0, 7) === publishedMonthKey)
      : viewingOwnPayroll
        ? []
        : bonuses;
  const scopedReimbursements =
    viewingOwnPayroll && publishedMonthKey
      ? reimbursements.filter(
          (claim) => claim.expenseDate.slice(0, 7) === publishedMonthKey,
        )
      : viewingOwnPayroll
        ? []
        : reimbursements;

  // Build latest detail from the already-fetched list row (includes breakdown).
  // Avoids a sequential getPayslipById + logo signing on first paint; PDF download
  // still uses the dedicated API path when the user requests it.
  const latest = (() => {
    if (!latestAccessible) return null;
    const { row, item, payroll } = latestAccessible;
    const payrollMonth = resolveRowPayrollMonth(payroll?.payroll_month, row.payslip_number);
    const schedule = resolvePayslipSchedule(
      payrollMonth,
      {
        salaryCreditDate: row.salary_credit_date ?? undefined,
        publishedAt: row.published_at ?? undefined,
      },
      scheduleOptions,
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
    const releaseAt = effectivePayslipReleaseAt(row.email_sent_at, breakdown);
    const access = resolvePayslipAvailability(
      schedule.publishedAt,
      profile.permissionCodes,
      new Date(),
      {
        employeeFacing: viewingOwnPayroll,
        emailSentAt: releaseAt,
      },
    );
    return {
      id: row.id,
      payslipNumber: row.payslip_number,
      issuedAt: row.issued_at,
      payrollMonth,
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
      basicSalary: Number(item?.basic_salary ?? 0),
      totalAllowances: Number(item?.total_allowances ?? 0),
      totalDeductions: Number(item?.total_deductions ?? 0),
      grossSalary: Number(item?.gross_salary ?? 0),
      netSalary: Number(item?.net_salary ?? 0),
      totalEarnings: Number(item?.gross_salary ?? 0),
      employerContributionTotal: 0,
      breakdown,
      employerContributions: [],
      bankAccount: null,
      leaveBalances: {
        casual: { usedInMonth: 0, balance: 0 },
        earned: { usedInMonth: 0, balance: 0 },
      },
      storagePath: null,
    } satisfies NonNullable<EmployeePayrollData["latest"]>;
  })();

  const latestTimeline = (() => {
    if (!latestAccessible?.payroll || !latestAccessible.row) return null;
    const schedule = resolvePayslipSchedule(
      latestAccessible.payroll.payroll_month,
      {
        salaryCreditDate: latestAccessible.row.salary_credit_date ?? undefined,
        publishedAt: latestAccessible.row.published_at ?? undefined,
      },
      scheduleOptions,
    );
    return buildTimeline({
      payroll: latestAccessible.payroll,
      emailSentAt: latestAccessible.row.email_sent_at,
      publishedAt: schedule.publishedAt,
      salaryCreditDate: schedule.salaryCreditDate,
      payrollLifecycle: (
        latestAccessible.item?.breakdown as PayrollBreakdown | null | undefined
      )?.payrollLifecycle,
    });
  })();

  let salaryStructure: EmployeeSalaryStructure | null = null;
  if (structureRow) {
    const components = (structureRow.components as Record<string, number>) ?? {};
    const lines = buildStructureLines({
      basic_salary: structureRow.basic_salary,
      hra_amount: structureRow.hra_amount,
      transport_allowance: structureRow.transport_allowance,
      other_allowances: structureRow.other_allowances,
      gross_salary: structureRow.gross_salary,
      tax_deduction: structureRow.tax_deduction,
      other_deductions: structureRow.other_deductions,
      components,
    });
    const split = resolveSalaryBreakdownFromStructure({
      gross_salary: structureRow.gross_salary,
      basic_salary: structureRow.basic_salary,
      hra_amount: structureRow.hra_amount,
      transport_allowance: structureRow.transport_allowance,
      other_allowances: structureRow.other_allowances,
      components,
    });
    salaryStructure = {
      effectiveFrom: structureRow.effective_from,
      currencyCode: structureRow.currency_code,
      basicSalary: split.basic,
      hraAmount: split.hra,
      transportAllowance: split.lta,
      otherAllowances: 0,
      taxDeduction: Number(structureRow.tax_deduction),
      otherDeductions: Number(structureRow.other_deductions),
      grossSalary: Number(structureRow.gross_salary),
      netSalary: Number(structureRow.net_salary),
      earnings: lines.earnings,
      deductions: lines.deductions,
    };
  }

  const bank = bankRow
    ? displaySalaryBankDetails({
        bankName: bankRow.bank_name,
        accountHolderName: bankRow.account_holder_name,
        accountNumberMasked: maskAccountNumber(bankRow.account_number),
        ifscCode: bankRow.ifsc_code ?? null,
        branchName: bankRow.branch_name ?? null,
        accountType: bankRow.account_type,
      })
    : null;

  const displaySummary = latest
    ? buildPublishedPayslipDisplaySummary(latest)
    : {
        earnings: [],
        deductions: [],
        grossSalary: 0,
        totalDeductions: 0,
        netSalary: 0,
        periodMonth: null,
        usingStructure: false,
        extrasIncluded: false,
      };

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
      payslipsForEmployee.length > 0 ||
      scopedBonuses.length > 0 ||
      bank !== null,
    kpis: {
      currentNetSalary: latest?.netSalary ?? null,
      currentGrossSalary: latest?.grossSalary ?? null,
      nextSalaryDate: computeNextSalaryDate(creditDay),
      lastPaymentDate: latest?.salaryCreditDate ?? null,
      latestStatus: latest?.payrollStatus ?? null,
      ytdEarnings,
      ytdTax,
    },
    latest,
    latestTimeline,
    payslips: payslipsForEmployee,
    salaryStructure,
    bank,
    bonuses: scopedBonuses,
    reimbursements: scopedReimbursements,
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
