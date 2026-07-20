import { PayslipTable } from "@/components/payroll/payslip-table";
import { createClient } from "@/lib/supabase/server";
import { listPayslips } from "@/lib/payroll/services/payroll-queries";
import { payrollListParamsSchema } from "@/lib/validations/payroll";
import { requireServerAnyPermission } from "@/lib/permissions/server";

type PayslipsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PayslipsPage({ searchParams }: PayslipsPageProps) {
  const profile = await requireServerAnyPermission([
    "payslip.view",
    "payroll.view",
  ]);
  const supabase = await createClient();
  const rawParams = await searchParams;
  const now = new Date();

  const params = payrollListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    month: rawParams.month,
    year: rawParams.year ?? now.getFullYear(),
    employeeId: rawParams.employeeId,
    search: typeof rawParams.search === "string" ? rawParams.search : undefined,
  });

  const result = await listPayslips(supabase, profile, params);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payslips</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View, download, and email employee payslips.
        </p>
      </div>
      <PayslipTable
        records={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
      />
    </>
  );
}
