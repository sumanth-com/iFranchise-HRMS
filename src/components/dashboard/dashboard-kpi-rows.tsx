import Link from "next/link";

import { DASHBOARD_KPI_LINKS } from "@/lib/dashboard/constants";
import type { DashboardKpis } from "@/types/dashboard";
import { cn } from "@/lib/utils";

function KpiTile({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  href: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="flex h-full min-h-[4.5rem] flex-col justify-between rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <p className="line-clamp-2 text-[10px] leading-tight font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", accent)}>
        {value}
      </p>
    </Link>
  );
}

export function DashboardKpiRow({ kpis }: { kpis: DashboardKpis }) {
  const items: {
    key: keyof typeof DASHBOARD_KPI_LINKS;
    label: string;
    value: string | number;
    accent?: string;
  }[] = [
    { key: "totalEmployees", label: "Total Employees", value: kpis.totalEmployees },
    {
      key: "presentToday",
      label: "Present Today",
      value: kpis.presentToday,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "onLeaveToday",
      label: "On Leave Today",
      value: kpis.onLeaveToday,
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "absentToday",
      label: "Absent Today",
      value: kpis.absentToday,
      accent: "text-destructive",
    },
    {
      key: "pendingLeaveApprovals",
      label: "Pending Leave Approvals",
      value: kpis.pendingLeaveApprovals,
      accent: "text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="grid h-full grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <KpiTile
          key={item.key}
          label={item.label}
          value={item.value}
          href={DASHBOARD_KPI_LINKS[item.key]}
          accent={item.accent}
        />
      ))}
    </div>
  );
}
