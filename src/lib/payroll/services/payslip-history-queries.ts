import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { canViewPayroll } from "@/lib/payroll/constants";
import {
  resolvePayslipAvailability,
  resolvePayslipSchedule,
} from "@/lib/payroll/services/payslip-publication";
import { getPayrollMonthDate } from "@/lib/payroll/services/payroll-utils";
import { payslipHistoryParamsSchema } from "@/lib/validations/payroll";
import type { UserProfile } from "@/types/auth";
import type {
  PayslipHistoryResult,
  PayslipHistoryStats,
  PayslipHistoryYearGroup,
  PayslipListItem,
  PayslipVersionItem,
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

function groupPayslipsByYear(payslips: PayslipListItem[]): PayslipHistoryYearGroup[] {
  const map = new Map<number, PayslipListItem[]>();
  for (const row of payslips) {
    const year = new Date(row.payrollMonth).getUTCFullYear();
    const bucket = map.get(year) ?? [];
    bucket.push(row);
    map.set(year, bucket);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, items]) => ({
      year,
      payslips: items.sort(
        (a, b) => new Date(b.payrollMonth).getTime() - new Date(a.payrollMonth).getTime(),
      ),
    }));
}

function buildStats(rows: PayslipListItem[]): PayslipHistoryStats {
  const published = rows.filter((row) => row.availability === "available");
  const years = Array.from(
    new Set(rows.map((row) => new Date(row.payrollMonth).getUTCFullYear())),
  ).sort((a, b) => b - a);

  const nets = published.map((row) => row.netSalary);
  const latest = published[0] ?? rows[0];

  return {
    totalPayslips: rows.length,
    yearsAvailable: years,
    latestSalary: latest?.netSalary ?? null,
    highestSalary: nets.length ? Math.max(...nets) : null,
    latestPublished: latest?.publishedAt ?? null,
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
};

export async function listPayslipHistory(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: PayslipHistoryParams,
): Promise<PayslipHistoryResult> {
  const parsed = payslipHistoryParamsSchema.parse(params);
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

  if (month && yearResolved.year) {
    query = query.eq("payrolls.payroll_month", getPayrollMonthDate(month, yearResolved.year));
  } else if (yearResolved.year) {
    const start = `${yearResolved.year}-01-01`;
    const end = `${yearResolved.year}-12-01`;
    query = query.gte("payrolls.payroll_month", start).lte("payrolls.payroll_month", end);
  } else if (month) {
    const monthStr = String(month).padStart(2, "0");
    query = query.like("payrolls.payroll_month", `%-${monthStr}-%`);
  }

  if (search) {
    const term = search.trim();
    query = query.or(
      `payslip_number.ilike.%${term}%,payrolls.payroll_month.ilike.%${term}%`,
    );
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
    );
    const versionCount = (versionCounts.get(row.id) ?? 0) + 1;

    return {
      id: row.id,
      payslipNumber: row.payslip_number,
      employeeId: row.employee_id,
      employeeCode: employee?.employee_code ?? "",
      employeeName: employee
        ? `${employee.first_name} ${employee.last_name}`.trim()
        : "",
      payrollMonth: payroll?.payroll_month ?? "",
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
      paymentStatus: paymentStatusLabel(
        payroll?.payroll_status ?? "draft",
        access.availability,
      ),
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
          published_at,
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
    if (month && yearResolved.year) {
      statsQuery = statsQuery.eq(
        "payrolls.payroll_month",
        getPayrollMonthDate(month, yearResolved.year),
      );
    } else if (yearResolved.year) {
      statsQuery = statsQuery
        .gte("payrolls.payroll_month", `${yearResolved.year}-01-01`)
        .lte("payrolls.payroll_month", `${yearResolved.year}-12-01`);
    } else if (month) {
      const monthStr = String(month).padStart(2, "0");
      statsQuery = statsQuery.like("payrolls.payroll_month", `%-${monthStr}-%`);
    }
    if (search) {
      statsQuery = statsQuery.or(
        `payslip_number.ilike.%${search.trim()}%,payrolls.payroll_month.ilike.%${search.trim()}%`,
      );
    }

    const { data: statsRows } = await statsQuery.order("issued_at", { ascending: false });
    const statItems: PayslipListItem[] = (statsRows ?? []).map((row) => {
      const payrollItem = unwrapRelation(row.payroll_items);
      const payroll = unwrapRelation(row.payrolls);
      const schedule = resolvePayslipSchedule(payroll?.payroll_month ?? "", {
        publishedAt: row.published_at ?? undefined,
      });
      const access = resolvePayslipAvailability(
        schedule.publishedAt,
        profile.permissionCodes,
      );
      return {
        id: row.id,
        payslipNumber: "",
        employeeId: "",
        employeeCode: "",
        employeeName: "",
        payrollMonth: payroll?.payroll_month ?? "",
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
        paymentStatus: "",
        isArchived: false,
        versionCount: 1,
      };
    });
    stats = buildStats(statItems);
    stats.totalPayslips = count ?? statItems.length;
  }

  return {
    data: rows,
    groups,
    stats,
    total: count ?? 0,
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
