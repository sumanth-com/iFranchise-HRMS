import {
  AlertCircle,
  CircleDollarSign,
  FileText,
  Users,
  Wallet,
} from "lucide-react";

import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import type { PayslipHistoryStats } from "@/types/payroll";

type PayslipHistorySummaryCardsProps = {
  stats: PayslipHistoryStats;
  mode: "employee" | "hr";
};

type CardConfig = {
  key: string;
  label: string;
  value: string;
  icon: typeof FileText;
  accent: string;
  bg: string;
};

export function PayslipHistorySummaryCards({ stats, mode }: PayslipHistorySummaryCardsProps) {
  const hrCards: CardConfig[] = [
    {
      key: "total",
      label: "Payslips issued",
      value: String(stats.totalPayslips),
      icon: FileText,
      accent: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      key: "employees",
      label: "Employees covered",
      value: String(stats.uniqueEmployees),
      icon: Users,
      accent: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      key: "disbursed",
      label: "Net disbursed",
      value: formatCurrency(stats.totalNetDisbursed),
      icon: Wallet,
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      key: "credited",
      label: "Credited",
      value: String(stats.creditedCount),
      icon: CircleDollarSign,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  if (stats.underReviewCount > 0) {
    hrCards.push({
      key: "review",
      label: "Under HR review",
      value: String(stats.underReviewCount),
      icon: AlertCircle,
      accent: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    });
  }

  const employeeCards: CardConfig[] = [
    {
      key: "total",
      label: "Payslips issued",
      value: String(stats.totalPayslips),
      icon: FileText,
      accent: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      key: "latest",
      label: stats.latestMonthLabel ? `Latest (${stats.latestMonthLabel})` : "Latest net pay",
      value:
        stats.latestSalary != null ? formatCurrency(stats.latestSalary) : "—",
      icon: CircleDollarSign,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      key: "received",
      label: "Total received",
      value: formatCurrency(stats.totalNetDisbursed),
      icon: Wallet,
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      key: "credited",
      label: "Credited payslips",
      value: String(stats.creditedCount),
      icon: Wallet,
      accent: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
    },
  ];

  const cards = mode === "hr" ? hrCards : employeeCards;

  return (
    <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="flex min-h-[4.75rem] min-w-0 rounded-xl border bg-card p-3 shadow-sm"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[11px] font-medium leading-4 text-muted-foreground sm:text-xs">
                  {card.label}
                </p>
                <p className="text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
                  {card.value}
                </p>
              </div>
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${card.bg}`}
              >
                <Icon className={`size-3.5 ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
