import { PayrollMonthlyOverview } from "@/components/payroll/payroll-monthly-overview";
import { PayrollRunsTable } from "@/components/payroll/payroll-runs-table";
import { PayrollSummaryCards } from "@/components/payroll/payroll-summary-cards";
import { createClient } from "@/lib/supabase/server";
import {
  getPayrollSummary,
  listPayrollRuns,
} from "@/lib/payroll/services/payroll-queries";
import { payrollListParamsSchema } from "@/lib/validations/payroll";
import { requireServerPermission } from "@/lib/permissions/server";

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
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor payroll runs, compensation, and employee payouts.
        </p>
      </div>

      <PayrollSummaryCards summary={summary} />
      <PayrollMonthlyOverview overview={summary.monthlyOverview} />

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium">Recent payroll runs</h2>
          <p className="text-xs text-muted-foreground">
            Latest payroll activity for the selected period
          </p>
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
    </>
  );
}
