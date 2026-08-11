"use client";

import { PayrollMonthlyOverview } from "@/components/payroll/payroll-monthly-overview";
import { PayrollSummaryCards } from "@/components/payroll/payroll-summary-cards";
import {
  getMonthSelectItems,
  getYearSelectItems,
} from "@/components/payroll/select-utils";
import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";
import { formatPayrollMonth } from "@/lib/payroll/services/payroll-utils";
import type { PayrollSummary } from "@/types/payroll";
import { useRouter } from "next/navigation";

const monthItems = getMonthSelectItems();
const yearItems = getYearSelectItems();

type HrTeamPayrollViewProps = {
  summary: PayrollSummary;
  month: number;
  year: number;
  embedded?: boolean;
};

export function HrTeamPayrollView({
  summary,
  month,
  year,
  embedded = false,
}: HrTeamPayrollViewProps) {
  const router = useRouter();
  const periodLabel = formatPayrollMonth(month, year);

  function updatePeriod(nextMonth: number, nextYear: number) {
    router.push(
      payrollHubUrl({
        tab: "team",
        section: TEAM_PAYROLL_SECTIONS.run,
        params: { month: String(nextMonth), year: String(nextYear) },
      }),
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {!embedded ? (
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
      ) : null}

      <PayrollSummaryCards summary={summary} compact />

      <PayrollMonthlyOverview
        overview={summary.monthlyOverview ?? []}
        year={year}
        month={month}
        periodLabel={periodLabel}
        monthItems={monthItems}
        yearItems={yearItems}
        onPeriodChange={updatePeriod}
        compact
        dashboard
      />
    </div>
  );
}
