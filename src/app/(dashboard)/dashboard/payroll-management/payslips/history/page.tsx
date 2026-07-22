import { PayslipHistoryView } from "@/components/payroll/payslip-history-view";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { listPayslipHistory } from "@/lib/payroll/services/payslip-history-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { payslipHistoryParamsSchema } from "@/lib/validations/payroll";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function HrPayslipHistoryPage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission(["payslip.view", "payroll.view"]);
  const supabase = await createClient();
  const raw = await searchParams;

  const params = payslipHistoryParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: firstString(raw.search),
    month: raw.month,
    year: raw.year,
    yearFilter: firstString(raw.yearFilter),
    employeeId: firstString(raw.employeeId),
    includeArchived: raw.includeArchived === "true",
    groupByYear: true,
  });

  const history = await listPayslipHistory(supabase, profile, params);

  return (
    <div className="space-y-4">
      <PayslipHistoryView
        history={history}
        mode="hr"
        basePath={PAYROLL_ROUTES.payslipHistory}
      />
    </div>
  );
}
