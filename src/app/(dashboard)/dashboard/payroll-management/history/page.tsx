import { PayrollRunsTable } from "@/components/payroll/payroll-runs-table";
import { createClient } from "@/lib/supabase/server";
import { listPayrollRuns } from "@/lib/payroll/services/payroll-queries";
import { payrollListParamsSchema } from "@/lib/validations/payroll";
import { requireServerPermission } from "@/lib/permissions/server";

type PayrollHistoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PayrollHistoryPage({
  searchParams,
}: PayrollHistoryPageProps) {
  const profile = await requireServerPermission("payroll.view");
  const supabase = await createClient();
  const rawParams = await searchParams;
  const now = new Date();

  const params = payrollListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    search: typeof rawParams.search === "string" ? rawParams.search : undefined,
    month: rawParams.month,
    year: rawParams.year ?? now.getFullYear(),
    payrollStatus: rawParams.payrollStatus,
    employeeId: rawParams.employeeId,
  });

  const result = await listPayrollRuns(supabase, profile, params);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search, filter, and review past payroll runs and payslips.
        </p>
      </div>
      <PayrollRunsTable
        records={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        search={params.search}
        month={params.month}
        year={params.year}
        payrollStatus={params.payrollStatus}
      />
    </>
  );
}
