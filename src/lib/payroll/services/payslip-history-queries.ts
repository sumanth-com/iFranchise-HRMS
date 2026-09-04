import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { isExcludedFromTeamPayslips } from "@/lib/employee/directory-listing";
import { canViewPayroll } from "@/lib/payroll/constants";
import {
  isPayslipHrSent,
  isPayslipPublishedToEmployee,
  resolvePayslipAvailability,
  resolvePayslipSchedule,
} from "@/lib/payroll/services/payslip-publication";
import { getPayrollMonthDate, parsePayrollMonthSearch, formatPayrollMonthLabel } from "@/lib/payroll/services/payroll-utils";
import { syncActiveEmployeesIntoPayrollRun, ensureCompanyPayrollRun, generatePayslips } from "@/lib/payroll/services/payroll-mutations";
import { payslipHistoryParamsSchema } from "@/lib/validations/payroll";
import type { UserProfile } from "@/types/auth";
import type {
  PayslipHistoryResult,
  PayslipHistoryStats,
  PayslipHistoryYearGroup,
  PayslipListItem,
  PayslipVersionItem,
  PayrollBreakdown,
  PayrollStatus,
} from "@/types/payroll";

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function paymentStatusLabel(status: PayrollStatus, availability: string): string {
  if (availability === "under_review") return "Under HR Review";
  switch (status) {
    case "paid":
      return "Credited";
    case "approved":
      return "Approved";
    case "processed":
      return "Processed";
    case "processing":
      return "Processing";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

function resolveYearFilter(
  yearFilter: "all" | "current" | "last" | undefined,
  explicitYear?: number,
): { year?: number; years?: number[] } {
  const now = new Date();
  const currentYear = now.getFullYear();
  if (explicitYear) return { year: explicitYear };
  if (yearFilter === "current") return { year: currentYear };
  if (yearFilter === "last") return { year: currentYear - 1 };
  return {};
}

function payrollMonthTime(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function groupPayslipsByYear(payslips: PayslipListItem[]): PayslipHistoryYearGroup[] {
  const map = new Map<number, PayslipListItem[]>();
  for (const row of payslips) {
    const time = payrollMonthTime(row.payrollMonth);
    if (time == null) continue;
    const year = new Date(time).getUTCFullYear();
    const bucket = map.get(year) ?? [];
    bucket.push(row);
    map.set(year, bucket);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, items]) => ({
      year,
      payslips: items.sort((a, b) => {
        const aTime = payrollMonthTime(a.payrollMonth) ?? 0;
        const bTime = payrollMonthTime(b.payrollMonth) ?? 0;
        return bTime - aTime;
      }),
    }));
}

function buildStats(rows: PayslipListItem[]): PayslipHistoryStats {
  const sentRows = rows.filter((row) => row.payslipSent);
  const readyRows = rows.filter(
    (row) => !row.payslipSent && row.id.length > 0,
  );
  const employeeIds = new Set(rows.map((row) => row.employeeId).filter(Boolean));
  const years = Array.from(
    new Set(
      rows
        .map((row) => payrollMonthTime(row.payrollMonth))
        .filter((time): time is number => time != null)
        .map((time) => new Date(time).getUTCFullYear()),
    ),
  ).sort((a, b) => b - a);

  const sentNets = sentRows.map((row) => row.netSalary);
  const latest = sentRows[0] ?? rows[0];
  const totalNetDisbursed = sentRows.reduce((sum, row) => sum + row.netSalary, 0);

  return {
    totalPayslips: sentRows.length,
    yearsAvailable: years,
    latestSalary: latest?.netSalary ?? null,
    highestSalary: sentNets.length ? Math.max(...sentNets) : null,
    latestPublished: latest?.publishedAt ?? null,
    creditedCount: sentRows.length,
    underReviewCount: readyRows.length,
    totalNetDisbursed,
    uniqueEmployees: employeeIds.size,
    latestMonthLabel: latest?.payrollMonth
      ? formatPayrollMonthLabel(latest.payrollMonth)
      : null,
  };
}

export type PayslipHistoryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  month?: number;
  year?: number;
  yearFilter?: "all" | "current" | "last";
  employeeId?: string;
  includeArchived?: boolean;
  groupByYear?: boolean;
  payslipStatus?: "all" | "pending" | "sent";
};

export async function listPayslipHistory(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: PayslipHistoryParams,
): Promise<PayslipHistoryResult> {
  const parsed = payslipHistoryParamsSchema.parse(params);
  const isHr = canViewPayroll(profile.permissionCodes);
  const yearResolved = resolveYearFilter(parsed.yearFilter, parsed.year);
  const filterMonth = parsed.month;
  const filterYear = yearResolved.year ?? (parsed.month ? new Date().getFullYear() : undefined);

  if (isHr && filterMonth && filterYear) {
    return listHrPayslipsFromPayrollRun(supabase, profile, {
      month: filterMonth,
      year: filterYear,
      search: parsed.search,
      employeeId: parsed.employeeId,
      page: parsed.page,
      pageSize: parsed.pageSize,
      payslipStatus: parsed.payslipStatus ?? "all",
    });
  }

  return listStoredPayslipHistory(supabase, profile, parsed);
}

async function listHrPayslipsFromPayrollRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    month: number;
    year: number;
    search?: string;
    employeeId?: string;
    page: number;
    pageSize: number;
    payslipStatus?: "all" | "pending" | "sent";
  },
): Promise<PayslipHistoryResult> {
  const payrollMonth = getPayrollMonthDate(input.month, input.year);

  let payroll: { id: string; payroll_month: string; payroll_status: string } | null = null;
  try {
    const payrollId = await ensureCompanyPayrollRun(supabase, profile, {
      month: input.month,
      year: input.year,
    });
    const { data, error: payrollError } = await supabase
      .schema("hrms")
      .from("payrolls")
      .select("id, payroll_month, payroll_status")
      .eq("id", payrollId)
      .is("deleted_at", null)
      .maybeSingle();
    if (payrollError) throw new Error(payrollError.message);
    payroll = data;
  } catch {
    payroll = null;
  }

  if (!payroll) {
    return {
      data: [],
      groups: [],
      stats: buildStats([]),
      total: 0,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  await syncActiveEmployeesIntoPayrollRun(supabase, profile, payroll.id);
  await generatePayslips(supabase, profile, payroll.id);

  let itemsQuery = supabase
    .schema("hrms")
    .from("payroll_items")
    .select(
      `
        id,
        employee_id,
        basic_salary,
        total_allowances,
        total_deductions,
        gross_salary,
        net_salary,
        breakdown,
        employees (
          employee_code,
          first_name,
          last_name,
          app_hidden_at,
          departments:department_id (name),
          designations:designation_id (title),
          employment_types:employment_type_id (name)
        ),
        payslips (id, payslip_number, issued_at, salary_credit_date, published_at, email_sent_at, archived_at, payslip_version)
      `,
    )
    .eq("payroll_id", payroll.id)
    .is("deleted_at", null);

  if (input.employeeId) {
    itemsQuery = itemsQuery.eq("employee_id", input.employeeId);
  }

  const { data: items, error: itemsError } = await itemsQuery;
  if (itemsError) throw new Error(itemsError.message);

  const now = new Date();
  let rows: PayslipListItem[] = [];
  for (const row of items ?? []) {
    const employee = unwrapRelation(row.employees) as
      | {
          employee_code?: string;
          first_name?: string;
          last_name?: string;
          app_hidden_at?: string | null;
          departments?: { name: string } | { name: string }[] | null;
          designations?: { title: string } | { title: string }[] | null;
          employment_types?: { name: string } | { name: string }[] | null;
        }
      | null;
    if (!employee) continue;
    const designation = unwrapRelation(
      employee.designations as { title: string } | { title: string }[] | null,
    );
    if (
      isExcludedFromTeamPayslips(employee.employee_code, {
        employeeCode: employee.employee_code,
        firstName: employee.first_name,
        lastName: employee.last_name,
        designationTitle: designation?.title ?? null,
      })
    ) {
      continue;
    }

    const breakdown = (row.breakdown as PayrollBreakdown | null) ?? {
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
    };

    const department = unwrapRelation(
      employee.departments as { name: string } | { name: string }[] | null,
    );
    const employmentType = employee
      ? unwrapRelation(
          employee.employment_types as { name: string } | { name: string }[] | null,
        )
      : null;
    const payslip = unwrapRelation(
      row.payslips as
        | {
            id: string;
            payslip_number: string;
            issued_at: string;
            salary_credit_date: string | null;
            published_at: string | null;
            email_sent_at: string | null;
            archived_at: string | null;
            payslip_version: string | null;
          }
        | {
            id: string;
            payslip_number: string;
            issued_at: string;
            salary_credit_date: string | null;
            published_at: string | null;
            email_sent_at: string | null;
            archived_at: string | null;
            payslip_version: string | null;
          }[]
        | null,
    );
    const sent = isPayslipHrSent({ emailSentAt: payslip?.email_sent_at ?? null });
    const payslipReady = Boolean(payslip?.id);

    rows.push({
      id: payslip?.id ?? "",
      payslipNumber: payslip?.payslip_number ?? "Pending",
      employeeId: row.employee_id,
      employeeCode: employee?.employee_code ?? "",
      employeeName: employee
        ? `${employee.first_name} ${employee.last_name}`.trim()
        : "",
      payrollMonth,
      grossSalary: Number(row.gross_salary ?? 0),
      netSalary: Number(row.net_salary ?? 0),
      payrollStatus: payroll.payroll_status as PayrollStatus,
      issuedAt: payslip?.issued_at ?? "",
      salaryCreditDate: payslip?.salary_credit_date ?? "",
      publishedAt: payslip?.published_at ?? "",
      availability: sent ? "available" : "under_review",
      canEmployeeAccess: sent,
      reviewMessage: sent ? null : "Payslip not sent yet",
      payslipVersion: payslip?.payslip_version ?? "—",
      paymentStatus: sent ? "Sent" : payslipReady ? "Ready to Send" : "Pending",
      isArchived: Boolean(payslip?.archived_at),
      versionCount: 1,
      payrollItemId: row.id,
      payslipSent: sent,
      hasPayslip: Boolean(payslip?.id),
      departmentName: department?.name ?? null,
      designationTitle: designation?.title ?? null,
      employmentTypeName: employmentType?.name ?? null,
      basicSalary: Number(row.basic_salary ?? 0),
      totalAllowances: Number(row.total_allowances ?? 0),
      totalDeductions: Number(row.total_deductions ?? 0),
      breakdown,
    });
  }

  const term = input.search?.trim().toLowerCase();
  if (term) {
    rows = rows.filter((row) => {
      const haystack =
        `${row.employeeName} ${row.employeeCode} ${row.payslipNumber} ${row.departmentName ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }

  rows.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));

  const sentRows = rows.filter((row) => row.payslipSent);
  const readyRows = rows.filter(
    (row) => !row.payslipSent && row.id.length > 0,
  );
  const stats: PayslipHistoryStats = {
    totalPayslips: sentRows.length,
    yearsAvailable: [input.year],
    latestSalary: rows[0]?.netSalary ?? null,
    highestSalary: rows.length ? Math.max(...rows.map((row) => row.netSalary)) : null,
    latestPublished: sentRows[0]?.publishedAt || null,
    creditedCount: sentRows.length,
    underReviewCount: readyRows.length + rows.filter((row) => !row.id).length,
    totalNetDisbursed: sentRows.reduce((sum, row) => sum + row.netSalary, 0),
    uniqueEmployees: rows.length,
    latestMonthLabel: formatPayrollMonthLabel(payrollMonth),
  };

  if (input.payslipStatus === "pending") {
    rows = rows.filter((row) => !row.payslipSent);
  } else if (input.payslipStatus === "sent") {
    rows = rows.filter((row) => row.payslipSent);
  }

  return {
    data: rows,
    groups: [],
    stats,
    total: rows.length,
    page: input.page,
    pageSize: input.pageSize,
  };
}

async function listStoredPayslipHistory(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  parsed: ReturnType<typeof payslipHistoryParamsSchema.parse>,
): Promise<PayslipHistoryResult> {
  const { page, pageSize, search, month, includeArchived, groupByYear } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const isHr = canViewPayroll(profile.permissionCodes);
  const employeeScope = isHr ? parsed.employeeId : profile.employee.id;
  const yearResolved = resolveYearFilter(parsed.yearFilter, parsed.year);

  let query = supabase
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
        email_sent_at,
        payslip_version,
        archived_at,
        is_current,
        employees!inner (
          employee_code,
          first_name,
          last_name,
          organization_id
        ),
        payroll_items:payroll_item_id (
          gross_salary,
          net_salary
        ),
        payrolls:payroll_id (
          payroll_month,
          payroll_status
        )
      `,
      { count: "exact" },
    )
    .eq("employees.organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .order("issued_at", { ascending: false });

  if (!isHr) {
    query = query.eq("employee_id", profile.employee.id).eq("is_current", true);
  } else if (employeeScope) {
    query = query.eq("employee_id", employeeScope);
  }

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  let filterMonth = month;
  let filterYear = yearResolved.year ?? (month ? new Date().getFullYear() : undefined);
  let payslipNumberTerm: string | undefined;

  if (search) {
    const parsedSearch = parsePayrollMonthSearch(search);
    if (parsedSearch?.month) {
      filterMonth = parsedSearch.month;
    }
    if (parsedSearch?.year) {
      filterYear = parsedSearch.year;
    }
    if (
      parsedSearch?.payslipNumber &&
      !parsedSearch.month &&
      !parsedSearch.year
    ) {
      payslipNumberTerm = parsedSearch.payslipNumber;
    }
  }

  let payrollQuery = supabase
    .schema("hrms")
    .from("payrolls")
    .select("id")
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (filterMonth && filterYear) {
    payrollQuery = payrollQuery.eq("payroll_month", getPayrollMonthDate(filterMonth, filterYear));
  } else if (filterYear) {
    payrollQuery = payrollQuery
      .gte("payroll_month", getPayrollMonthDate(1, filterYear))
      .lte("payroll_month", getPayrollMonthDate(12, filterYear));
  }

  let periodPayrollIds: string[] | null = null;
  if (filterMonth || filterYear) {
    const { data: payrollRows, error: payrollError } = await payrollQuery;
    if (payrollError) throw new Error(payrollError.message);
    periodPayrollIds = (payrollRows ?? []).map((row) => row.id);
    if (periodPayrollIds.length === 0) {
      return {
        data: [],
        groups: [],
        stats: buildStats([]),
        total: 0,
        page,
        pageSize,
      };
    }
    query = query.in("payroll_id", periodPayrollIds);
  }

  if (payslipNumberTerm) {
    query = query.ilike("payslip_number", `%${payslipNumberTerm}%`);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const payslipIds = (data ?? []).map((row) => row.id);
  const versionCounts = new Map<string, number>();

  if (payslipIds.length > 0) {
    const { data: versions } = await supabase
      .schema("hrms")
      .from("payslip_versions")
      .select("payslip_id")
      .in("payslip_id", payslipIds);

    for (const version of versions ?? []) {
      versionCounts.set(version.payslip_id, (versionCounts.get(version.payslip_id) ?? 0) + 1);
    }
  }

  const rows: PayslipListItem[] = (data ?? []).map((row) => {
    const employee = unwrapRelation(row.employees);
    const payrollItem = unwrapRelation(row.payroll_items);
    const payroll = unwrapRelation(row.payrolls);
    const schedule = resolvePayslipSchedule(payroll?.payroll_month ?? "", {
      salaryCreditDate: row.salary_credit_date ?? undefined,
      publishedAt: row.published_at ?? undefined,
    });
    const access = resolvePayslipAvailability(
      schedule.publishedAt,
      profile.permissionCodes,
      new Date(),
      {
        employeeFacing: row.employee_id === profile.employee.id,
        emailSentAt: row.email_sent_at,
      },
    );
    const versionCount = (versionCounts.get(row.id) ?? 0) + 1;

    const payrollMonthValue =
      payroll?.payroll_month ||
      (filterMonth && filterYear ? getPayrollMonthDate(filterMonth, filterYear) : "");

    return {
      id: row.id,
      payslipNumber: row.payslip_number,
      employeeId: row.employee_id,
      employeeCode: employee?.employee_code ?? "",
      employeeName: employee
        ? `${employee.first_name} ${employee.last_name}`.trim()
        : "",
      payrollMonth: payrollMonthValue,
      grossSalary: Number(payrollItem?.gross_salary ?? 0),
      netSalary: Number(payrollItem?.net_salary ?? 0),
      payrollStatus: payroll?.payroll_status ?? "draft",
      issuedAt: row.issued_at,
      salaryCreditDate: schedule.salaryCreditDate,
      publishedAt: schedule.publishedAt,
      availability: access.availability,
      canEmployeeAccess: access.canEmployeeAccess,
      reviewMessage: access.reviewMessage,
      payslipVersion: row.payslip_version ?? "1.0",
      payslipSent: isPayslipHrSent({ emailSentAt: row.email_sent_at }),
      paymentStatus: isPayslipHrSent({ emailSentAt: row.email_sent_at })
        ? "Sent"
        : "Ready to Send",
      isArchived: Boolean(row.archived_at),
      versionCount,
    };
  });

  const groups = groupByYear ? groupPayslipsByYear(rows) : [];

  let stats = buildStats(rows);
  if ((count ?? 0) > rows.length) {
    let statsQuery = supabase
      .schema("hrms")
      .from("payslips")
      .select(
        `
          id,
          employee_id,
          published_at,
          email_sent_at,
          employees!inner (organization_id),
          payroll_items:payroll_item_id (net_salary),
          payrolls:payroll_id (payroll_month, payroll_status)
        `,
      )
      .eq("employees.organization_id", profile.employee.organizationId)
      .is("deleted_at", null);

    if (!isHr) {
      statsQuery = statsQuery.eq("employee_id", profile.employee.id).eq("is_current", true);
    } else if (employeeScope) {
      statsQuery = statsQuery.eq("employee_id", employeeScope);
    }
    if (!includeArchived) statsQuery = statsQuery.is("archived_at", null);
    if (periodPayrollIds) {
      statsQuery = statsQuery.in("payroll_id", periodPayrollIds);
    }
    if (payslipNumberTerm) {
      statsQuery = statsQuery.ilike("payslip_number", `%${payslipNumberTerm}%`);
    }

    // Cap stats aggregation — unbounded org-wide payslip fetch was blocking history nav.
    const STATS_ROW_CAP = 500;
    const { data: statsRows } = await statsQuery
      .order("issued_at", { ascending: false })
      .limit(STATS_ROW_CAP);
    const statItems: PayslipListItem[] = (statsRows ?? []).map((row) => {
      const payrollItem = unwrapRelation(row.payroll_items);
      const payroll = unwrapRelation(row.payrolls);
      const schedule = resolvePayslipSchedule(payroll?.payroll_month ?? "", {
        publishedAt: row.published_at ?? undefined,
      });
      const access = resolvePayslipAvailability(
        schedule.publishedAt,
        profile.permissionCodes,
        new Date(),
        {
          employeeFacing: row.employee_id === profile.employee.id,
          emailSentAt: row.email_sent_at,
        },
      );

      const payrollMonthValue =
        payroll?.payroll_month ||
        (filterMonth && filterYear ? getPayrollMonthDate(filterMonth, filterYear) : "");

      return {
        id: row.id,
        payslipNumber: "",
        employeeId: row.employee_id ?? "",
        employeeCode: "",
        employeeName: "",
        payrollMonth: payrollMonthValue,
        grossSalary: 0,
        netSalary: Number(payrollItem?.net_salary ?? 0),
        payrollStatus: payroll?.payroll_status ?? "draft",
        issuedAt: "",
        salaryCreditDate: schedule.salaryCreditDate,
        publishedAt: schedule.publishedAt,
        availability: access.availability,
        canEmployeeAccess: access.canEmployeeAccess,
        reviewMessage: null,
        payslipVersion: "1.0",
        payslipSent: isPayslipHrSent({ emailSentAt: row.email_sent_at }),
        paymentStatus: isPayslipHrSent({ emailSentAt: row.email_sent_at })
          ? "Sent"
          : "Ready to Send",
        isArchived: false,
        versionCount: 1,
      };
    });
    stats = buildStats(statItems);
  }

  let resultRows = rows;
  let resultGroups = groups;
  if (!isHr) {
    resultRows = rows.filter((row) => row.canEmployeeAccess);
    resultGroups = groupByYear ? groupPayslipsByYear(resultRows) : [];
    stats = buildStats(resultRows);
  }

  return {
    data: resultRows,
    groups: resultGroups,
    stats,
    total: isHr ? (count ?? 0) : resultRows.length,
    page,
    pageSize,
  };
}

export async function listPayslipVersions(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payslipId: string,
): Promise<PayslipVersionItem[]> {
  if (!canViewPayroll(profile.permissionCodes)) {
    return [];
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("payslip_versions")
    .select(
      "id, payslip_id, version_number, payslip_number, storage_path, salary_credit_date, published_at, created_at",
    )
    .eq("payslip_id", payslipId)
    .order("version_number", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    payslipId: row.payslip_id,
    versionNumber: row.version_number,
    payslipNumber: row.payslip_number,
    storagePath: row.storage_path,
    salaryCreditDate: row.salary_credit_date,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  }));
}
