import { PayslipHistoryView } from "@/components/payroll/payslip-history-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
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

export default async function ManagerPayrollHistoryPage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "payslip.view",
  ]);
  const supabase = await createClient();
  const raw = await searchParams;

  const now = new Date();
  const params = payslipHistoryParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: firstString(raw.search),
    month: firstString(raw.month) ?? now.getMonth() + 1,
    year: firstString(raw.year) ?? now.getFullYear(),
    groupByYear: false,
  });

  const history = await listPayslipHistory(supabase, profile, params);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <PayslipHistoryView
        history={history}
        mode="employee"
        month={params.month ?? now.getMonth() + 1}
        year={params.year ?? now.getFullYear()}
        basePath={MANAGER_ROUTES.payrollHistory}
      />
    </div>
  );
}
