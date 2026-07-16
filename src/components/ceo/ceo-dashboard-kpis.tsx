import Link from "next/link";

import { CEO_ROUTES } from "@/lib/ceo/constants";
import { formatCurrencyInr } from "@/lib/reports/services/reports-utils";
import type { CeoKpis } from "@/types/ceo-dashboard";
import { cn } from "@/lib/utils";

function KpiCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: string;
  href: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="flex h-full min-h-[4rem] w-full min-w-0 flex-col justify-between rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-colors hover:border-primary/20 hover:bg-primary/[0.02]"
    >
      <p className="line-clamp-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("text-lg font-semibold tracking-tight tabular-nums sm:text-xl", accent)}>
        {value}
      </p>
    </Link>
  );
}

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function CeoDashboardKpis({ kpis }: { kpis: CeoKpis }) {
  const items = [
    {
      label: "Employees",
      value: String(kpis.totalEmployees),
      href: CEO_ROUTES.organization,
    },
    {
      label: "Attendance",
      value: formatPercent(kpis.attendancePercent),
      href: CEO_ROUTES.attendance,
      accent:
        kpis.attendancePercent < 85
          ? "text-destructive"
          : "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Attrition",
      value: formatPercent(kpis.attritionRate),
      href: CEO_ROUTES.organization,
      accent: kpis.attritionRate >= 5 ? "text-destructive" : undefined,
    },
    {
      label: "Open Roles",
      value: String(kpis.openPositions),
      href: CEO_ROUTES.recruitment,
    },
    {
      label: "Pending Approvals",
      value: String(kpis.pendingApprovals),
      href: CEO_ROUTES.approvals,
      accent: kpis.pendingApprovals > 0 ? "text-violet-600 dark:text-violet-400" : undefined,
    },
    {
      label: "Payroll Cost",
      value: formatCurrencyInr(kpis.payrollCost),
      href: CEO_ROUTES.payroll,
    },
  ] as const;

  return (
    <section aria-label="Executive KPIs" className="w-full shrink-0">
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <KpiCard
            key={item.label}
            label={item.label}
            value={item.value}
            href={item.href}
            accent={"accent" in item ? item.accent : undefined}
          />
        ))}
      </div>
    </section>
  );
}
