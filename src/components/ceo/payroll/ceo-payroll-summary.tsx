import {
  CeoStatCard,
  formatCeoCurrency,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoPayrollKpis } from "@/types/ceo-payroll";

export function CeoPayrollSummary({ kpis }: { kpis: CeoPayrollKpis }) {
  return (
    <section
      aria-label="Payroll KPIs"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5"
    >
      <CeoStatCard
        label="Total Payroll Cost"
        value={formatCeoCurrency(kpis.totalPayrollCost)}
      />
      <CeoStatCard
        label="Current Month Payroll"
        value={formatCeoCurrency(kpis.currentMonthPayroll)}
      />
      <CeoStatCard label="Payroll Processed" value={String(kpis.payrollProcessed)} />
      <CeoStatCard
        label="Pending Payroll"
        value={String(kpis.pendingPayroll)}
        accent={kpis.pendingPayroll > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
      />
      <CeoStatCard
        label="Average Employee Salary"
        value={formatCeoCurrency(kpis.averageEmployeeSalary)}
      />
      <CeoStatCard label="Benefits Cost" value={formatCeoCurrency(kpis.benefitsCost)} />
      <CeoStatCard label="Bonus Cost" value={formatCeoCurrency(kpis.bonusCost)} />
      <CeoStatCard label="Deductions" value={formatCeoCurrency(kpis.deductions)} />
      <CeoStatCard
        label="Upcoming Payroll Date"
        value={
          kpis.upcomingPayrollDate
            ? new Date(kpis.upcomingPayrollDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—"
        }
      />
      <CeoStatCard label="Payroll Status" value={kpis.payrollStatusLabel} />
    </section>
  );
}
