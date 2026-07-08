import { AlertTriangle, BarChart3, CheckCircle2, Target, TrendingUp, Users } from "lucide-react";

import { KPI_SUMMARY_LABELS } from "@/lib/performance/constants";
import type { PerformanceSummary } from "@/types/performance";

type KpiSummaryCardsProps = {
  summary: PerformanceSummary;
};

const CARDS = [
  { key: "activeKpis" as const, icon: Target, accent: "text-blue-600", bg: "bg-blue-500/10", suffix: "" },
  { key: "completedKpis" as const, icon: CheckCircle2, accent: "text-emerald-600", bg: "bg-emerald-500/10", suffix: "" },
  { key: "overdueKpis" as const, icon: AlertTriangle, accent: "text-destructive", bg: "bg-destructive/10", suffix: "" },
  { key: "averageKpiCompletion" as const, icon: TrendingUp, accent: "text-violet-600", bg: "bg-violet-500/10", suffix: "%" },
  { key: "topPerformingDepartment" as const, icon: BarChart3, accent: "text-amber-600", bg: "bg-amber-500/10", suffix: "", isText: true },
  { key: "employeesNeedingKpiReview" as const, icon: Users, accent: "text-primary", bg: "bg-primary/10", suffix: "" },
];

export function KpiSummaryCards({ summary }: KpiSummaryCardsProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">KPI Overview</h2>
        <p className="text-xs text-muted-foreground">Live KPI metrics across the organization</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const raw = summary[card.key];
          const value = card.isText ? (raw || "—") : raw;
          return (
            <div key={card.key} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {KPI_SUMMARY_LABELS[card.key]}
                  </p>
                  <p className="mt-2 truncate text-xl font-semibold tracking-tight">
                    {value}
                    {!card.isText ? card.suffix : ""}
                  </p>
                </div>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.accent}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
