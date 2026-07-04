import { formatPayrollMonthLabel, formatCurrency } from "@/lib/payroll/services/payroll-utils";
import type { PayrollSummary } from "@/types/payroll";

type PayrollMonthlyOverviewProps = {
  overview: PayrollSummary["monthlyOverview"];
};

export function PayrollMonthlyOverview({ overview }: PayrollMonthlyOverviewProps) {
  const maxNet = Math.max(...overview.map((item) => item.net), 1);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-medium">Monthly payroll overview</h2>
        <p className="text-xs text-muted-foreground">
          Net payroll by month for the selected year
        </p>
      </div>
      <div className="grid grid-cols-6 gap-3 sm:grid-cols-12">
        {overview.map((item) => {
          const height = item.net > 0 ? Math.max(12, (item.net / maxNet) * 96) : 8;
          return (
            <div key={item.month} className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-full items-end justify-center">
                <div
                  className="w-full max-w-8 rounded-t-md bg-primary/80"
                  style={{ height }}
                  title={`${formatCurrency(item.net)}`}
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
