import { formatPayrollMonthLabel, formatCurrency } from "@/lib/payroll/services/payroll-utils";
import type { PayrollSummary } from "@/types/payroll";

type PayrollMonthlyOverviewProps = {
  overview: PayrollSummary["monthlyOverview"];
  compact?: boolean;
};

export function PayrollMonthlyOverview({ overview, compact = false }: PayrollMonthlyOverviewProps) {
  const maxNet = Math.max(...overview.map((item) => item.net), 1);
  const yearNet = overview.reduce((sum, item) => sum + item.net, 0);
  const paidMonths = overview.filter((item) => item.status === "paid").length;

  return (
    <div className="h-full rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Monthly payroll overview</h2>
          <p className="text-xs text-muted-foreground">
            Net payroll by month for the selected year
          </p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Year net
          </p>
          <p className="text-sm font-semibold">{formatCurrency(yearNet)}</p>
        </div>
      </div>
      <div className="grid grid-cols-12 items-end gap-3">
        {overview.map((item) => {
          const height = item.net > 0
            ? Math.max(12, (item.net / maxNet) * (compact ? 70 : 96))
            : 8;
          return (
            <div key={item.month} className="flex flex-col items-center gap-2">
              <div className={compact ? "flex h-[5.2rem] w-full items-end justify-center" : "flex h-24 w-full items-end justify-center"}>
                <div
                  className="w-full max-w-7 rounded-t-md bg-gradient-to-t from-primary/90 to-primary/45"
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
      <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
        <span className="text-muted-foreground">Paid months</span>
        <span className="font-semibold">{paidMonths} / 12</span>
      </div>
    </div>
  );
}
