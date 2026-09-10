import {
  listApprovedReimbursementsForPeriod,
  sumApprovedReimbursementAmounts,
} from "@/lib/payroll/services/approved-reimbursements";
import {
  getPayrollSummary,
  getReimbursementSummary,
} from "@/lib/payroll/services/payroll-queries";
import { formatPayrollMonth, getPayrollMonthDate } from "@/lib/payroll/services/payroll-utils";
import { PAYROLL_STATUS_LABELS } from "@/lib/payroll/constants";
import type { UserProfile } from "@/types/auth";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { PayrollStatus } from "@/types/payroll";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";

function nextMonthPeriod(month: number, year: number) {
  if (month === 12) return { month: 1, year: year + 1 };
  return { month: month + 1, year };
}

function statusLabel(status: string | null | undefined) {
  if (!status) return "Not started";
  return (
    PAYROLL_STATUS_LABELS[status as PayrollStatus] ?? status
  );
}

export async function getAccountantDashboardData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const organizationId = profile.employee.organizationId;
  const next = nextMonthPeriod(month, year);

  const [summary, recentRes, approvedClaims, reimbursementSummary, currentPayrollRes] =
    await Promise.all([
      getPayrollSummary(supabase, profile, month, year),
      supabase
        .schema("hrms")
        .from("payrolls")
        .select("id, payroll_month, payroll_status, total_net, updated_at")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5),
      listApprovedReimbursementsForPeriod(supabase, {
        organizationId,
        month,
        year,
      }),
      getReimbursementSummary(supabase, profile),
      supabase
        .schema("hrms")
        .from("payrolls")
        .select("id, payroll_status, total_net, updated_at, payroll_month")
        .eq("organization_id", organizationId)
        .eq("payroll_month", getPayrollMonthDate(month, year))
        .is("deleted_at", null)
        .maybeSingle(),
    ]);

  if (recentRes.error) throw new Error(recentRes.error.message);
  if (currentPayrollRes.error) throw new Error(currentPayrollRes.error.message);

  const recentActivity = (recentRes.data ?? []).map((row) => {
    const payrollMonth = String(row.payroll_month ?? "");
    const parsed = new Date(payrollMonth);
    const m = Number.isNaN(parsed.getTime()) ? null : parsed.getUTCMonth() + 1;
    const y = Number.isNaN(parsed.getTime()) ? null : parsed.getUTCFullYear();
    return {
      id: String(row.id),
      label:
        m && y
          ? formatPayrollMonth(m, y)
          : "Payroll run",
      status: row.payroll_status ? String(row.payroll_status) : null,
      month: m,
      year: y,
      net: Number(row.total_net ?? 0),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    };
  });

  const lastCompleted = (recentRes.data ?? []).find((row) => {
    const status = String(row.payroll_status ?? "");
    return status === "paid" || status === "approved";
  });

  let lastCompletedLabel: string | null = null;
  if (lastCompleted?.payroll_month) {
    const parsed = new Date(String(lastCompleted.payroll_month));
    if (!Number.isNaN(parsed.getTime())) {
      lastCompletedLabel = formatPayrollMonth(
        parsed.getUTCMonth() + 1,
        parsed.getUTCFullYear(),
      );
    }
  }

  const currentStatus = currentPayrollRes.data?.payroll_status
    ? String(currentPayrollRes.data.payroll_status)
    : null;

  const approvedBucket = reimbursementSummary.cards.find((c) => c.status === "approved");
  const pendingBucket = reimbursementSummary.cards.find((c) => c.status === "pending");

  const periodApprovedTotal = sumApprovedReimbursementAmounts(approvedClaims);

  return {
    greeting: {
      firstName: profile.employee.firstName || "there",
      fullName: `${profile.employee.firstName} ${profile.employee.lastName ?? ""}`.trim(),
    },
    summary,
    month,
    year,
    periodLabel: formatPayrollMonth(month, year),
    nextPeriodLabel: formatPayrollMonth(next.month, next.year),
    currentPayrollStatus: currentStatus,
    currentPayrollStatusLabel: statusLabel(currentStatus),
    lastCompletedPayroll: lastCompleted
      ? {
          label: lastCompletedLabel ?? "Previous run",
          status: String(lastCompleted.payroll_status),
          statusLabel: statusLabel(String(lastCompleted.payroll_status)),
          net: Number(lastCompleted.total_net ?? 0),
          updatedAt: lastCompleted.updated_at
            ? String(lastCompleted.updated_at)
            : null,
        }
      : null,
    nextActionLabel: !currentStatus
      ? `Start ${formatPayrollMonth(month, year)} payroll`
      : currentStatus === "draft" || currentStatus === "processing"
        ? "Continue payroll processing"
        : currentStatus === "processed"
          ? "Review and finalize payroll"
          : `Prepare ${formatPayrollMonth(next.month, next.year)}`,
    approvedReimbursements: {
      count: approvedClaims.length,
      total: periodApprovedTotal,
    },
    reimbursementOverview: {
      approvedCount: approvedBucket?.count ?? 0,
      approvedTotal: approvedBucket?.totalAmount ?? 0,
      pendingCount: pendingBucket?.count ?? 0,
      pendingTotal: pendingBucket?.totalAmount ?? 0,
    },
    recentActivity,
    links: ACCOUNTANT_ROUTES,
  };
}

export type AccountantDashboardData = Awaited<
  ReturnType<typeof getAccountantDashboardData>
>;
