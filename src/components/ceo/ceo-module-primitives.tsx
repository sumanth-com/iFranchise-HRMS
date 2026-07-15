import Link from "next/link";

import { BarRow } from "@/components/reports/report-chart-cards";
import { formatCurrencyInr } from "@/lib/reports/services/reports-utils";
import type { CeoChartItem } from "@/types/ceo-dashboard";
import { cn } from "@/lib/utils";

export function CeoModulePageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function CeoStatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3.5 shadow-sm">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", accent)}>{value}</p>
    </div>
  );
}

export function CeoChartPanel({
  title,
  items,
  color = "bg-primary",
  formatValue,
}: {
  title: string;
  items: CeoChartItem[];
  color?: string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data available.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <BarRow
              key={item.label}
              label={item.label}
              value={item.value}
              max={max}
              color={color}
              formatValue={formatValue}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CeoBackToDashboard() {
  return (
    <Link href="/ceo" className="text-xs font-medium text-primary hover:underline">
      ← Back to Executive Dashboard
    </Link>
  );
}

export function formatCeoCurrency(value: number) {
  return formatCurrencyInr(value);
}

export function formatCeoPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}
