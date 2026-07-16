import {
  CeoStatCard,
  formatCeoCurrency,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoPayrollKpis } from "@/types/ceo-payroll";
import { cn } from "@/lib/utils";

export function CeoPayrollSummary({ kpis }: { kpis: CeoPayrollKpis }) {
  return (
    <section
      aria-label="Payroll KPIs"
      className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      <CeoStatCard
        label="Month Payroll"
        value={formatCeoCurrency(kpis.currentMonthPayroll)}
      />
      <CeoStatCard
        label="Total Cost"
        value={formatCeoCurrency(kpis.totalPayrollCost)}
      />
      <CeoStatCard
        label="Pending"
        value={String(kpis.pendingPayroll)}
        accent={kpis.pendingPayroll > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
      />
      <CeoStatCard label="Benefits" value={formatCeoCurrency(kpis.benefitsCost)} />
      <CeoStatCard
        label="Avg Salary"
        value={formatCeoCurrency(kpis.averageEmployeeSalary)}
      />
      <CeoStatCard
        label="Status"
        value={kpis.payrollStatusLabel}
        accent={cn(
          kpis.payrollStatus === "draft" || kpis.payrollStatus === "processing"
            ? "text-amber-700 dark:text-amber-400"
            : kpis.payrollStatus === "paid" || kpis.payrollStatus === "approved"
              ? "text-emerald-600 dark:text-emerald-400"
              : undefined,
        )}
      />
    </section>
  );
}
