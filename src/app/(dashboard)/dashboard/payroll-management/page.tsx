import { PayrollMonthlyOverview } from "@/components/payroll/payroll-monthly-overview";
import { PayrollRunsTable } from "@/components/payroll/payroll-runs-table";
import { PayrollSummaryCards } from "@/components/payroll/payroll-summary-cards";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { createClient } from "@/lib/supabase/server";
import {
  getPayrollSummary,
  listPayrollRuns,
} from "@/lib/payroll/services/payroll-queries";
import { payrollListParamsSchema } from "@/lib/validations/payroll";
import { requireServerPermission } from "@/lib/permissions/server";
import Link from "next/link";
import { buttonVariants } from "@/components/common/button";
import { cn } from "@/lib/utils";

type PayrollDashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PayrollDashboardPage({
  searchParams,
}: PayrollDashboardPageProps) {
  const profile = await requireServerPermission("payroll.view");
  const supabase = await createClient();
  const rawParams = await searchParams;
  const now = new Date();

  const params = payrollListParamsSchema.parse({
    page: 1,
    pageSize: 5,
    month: rawParams.month ?? now.getMonth() + 1,
    year: rawParams.year ?? now.getFullYear(),
  });

  const [summary, recentRuns] = await Promise.all([
    getPayrollSummary(supabase, profile, params.month, params.year),
    listPayrollRuns(supabase, profile, params),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor payroll runs, compensation, and employee payouts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={PAYROLL_ROUTES.run}
            className={cn(buttonVariants({ size: "sm" }), "h-9")}
          >
            Run Payroll
          </Link>
          <Link
            href={PAYROLL_ROUTES.history}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
          >
            View History
          </Link>
        </div>
      </div>

      <PayrollSummaryCards summary={summary} compact />

      <div className="space-y-5">
        <PayrollMonthlyOverview overview={summary.monthlyOverview} compact />

        <section className="min-h-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Recent payroll runs</h2>
              <p className="text-xs text-muted-foreground">
                Latest payroll activity for the selected period
              </p>
            </div>
            <Link
              href={PAYROLL_ROUTES.history}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <PayrollRunsTable
            records={recentRuns.data}
            total={recentRuns.total}
            page={recentRuns.page}
            pageSize={recentRuns.pageSize}
            month={params.month}
            year={params.year}
            showFilters={false}
            compact
          />
        </section>
      </div>
    </div>
  );
}
