import { PayslipHistoryView } from "@/components/payroll/payslip-history-view";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { listPayslipHistory } from "@/lib/payroll/services/payslip-history-queries";
import { processDuePayslipPublications } from "@/lib/payroll/services/payslip-publication-worker";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import { payslipHistoryParamsSchema } from "@/lib/validations/payroll";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function EmployeePayrollHistoryPage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "payslip.view",
  ]);
  const supabase = await createClient();
  const raw = await searchParams;

  void processDuePayslipPublications(supabase, profile, siteConfig.url).catch(() => undefined);

  const params = payslipHistoryParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: firstString(raw.search),
    month: raw.month,
    year: raw.year,
    yearFilter: firstString(raw.yearFilter),
    groupByYear: true,
  });

  const history = await listPayslipHistory(supabase, profile, params);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <PayslipHistoryView
        history={history}
        mode="employee"
        basePath={EMPLOYEE_ROUTES.payrollHistory}
      />
    </div>
  );
}
