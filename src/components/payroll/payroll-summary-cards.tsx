import {
  Banknote,
  CircleDollarSign,
  MinusCircle,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";

import { PAYROLL_SUMMARY_LABELS } from "@/lib/payroll/constants";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import type { PayrollSummary } from "@/types/payroll";

type PayrollSummaryCardsProps = {
  summary: PayrollSummary;
  compact?: boolean;
};

const CARDS = [
  {
    key: "totalPayroll" as const,
    icon: Wallet,
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    format: (v: number) => formatCurrency(v),
  },
  {
    key: "employeesProcessed" as const,
    icon: Users,
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    format: (v: number) => String(v),
  },
  {
    key: "pendingPayroll" as const,
    icon: Receipt,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    format: (v: number) => String(v),
  },
  {
    key: "grossPayroll" as const,
    icon: Banknote,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    format: (v: number) => formatCurrency(v),
  },
  {
    key: "totalDeductions" as const,
    icon: MinusCircle,
    accent: "text-destructive",
    bg: "bg-destructive/10",
    format: (v: number) => formatCurrency(v),
  },
  {
    key: "netPayroll" as const,
    icon: CircleDollarSign,
    accent: "text-primary",
    bg: "bg-primary/10",
    format: (v: number) => formatCurrency(v),
  },
];

export function PayrollSummaryCards({ summary, compact = false }: PayrollSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = summary[card.key];
        return (
          <div
            key={card.key}
            className="rounded-xl border bg-card p-3.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {PAYROLL_SUMMARY_LABELS[card.key]}
                </p>
                <p className={compact ? "mt-1.5 text-xl font-semibold tracking-tight" : "mt-2 text-2xl font-semibold tracking-tight"}>
                  {card.format(value)}
                </p>
              </div>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <Icon className={`${compact ? "h-4 w-4" : "h-5 w-5"} ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
