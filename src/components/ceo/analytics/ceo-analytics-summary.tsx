import {
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoAnalyticsKpis } from "@/types/ceo-analytics";

function deltaHint(current: number, previous?: number) {
  if (previous == null) return null;
  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) return "vs prior · 0";
  return `vs prior · ${delta > 0 ? "+" : ""}${delta}`;
}

export function CeoAnalyticsSummary({ kpis }: { kpis: CeoAnalyticsKpis }) {
  const cards = [
    {
      label: "Health Score",
      value: String(kpis.companyHealthScore),
      accent: undefined as string | undefined,
      hint: deltaHint(kpis.companyHealthScore, kpis.previous?.companyHealthScore),
    },
    {
      label: "Retention",
      value: formatCeoPercent(kpis.employeeRetentionRate),
      accent: "text-emerald-600 dark:text-emerald-400",
      hint: deltaHint(
        kpis.employeeRetentionRate,
        kpis.previous?.employeeRetentionRate,
      ),
    },
    {
      label: "Attendance",
      value: formatCeoPercent(kpis.attendanceCompliancePercent),
      accent:
        kpis.attendanceCompliancePercent < 80
          ? "text-amber-700 dark:text-amber-400"
          : undefined,
      hint: deltaHint(
        kpis.attendanceCompliancePercent,
        kpis.previous?.attendanceCompliancePercent,
      ),
    },
    {
      label: "Performance",
      value: String(kpis.performanceIndex),
      accent: undefined,
      hint: deltaHint(kpis.performanceIndex, kpis.previous?.performanceIndex),
    },
    {
      label: "Hiring Success",
      value: formatCeoPercent(kpis.hiringSuccessRate),
      accent: undefined,
      hint: deltaHint(kpis.hiringSuccessRate, kpis.previous?.hiringSuccessRate),
    },
    {
      label: "Payroll Growth",
      value: formatCeoPercent(kpis.payrollGrowthPercent),
      accent:
        kpis.payrollGrowthPercent >= 5
          ? "text-amber-700 dark:text-amber-400"
          : undefined,
      hint: deltaHint(kpis.payrollGrowthPercent, kpis.previous?.payrollGrowthPercent),
    },
  ];

  return (
    <section
      aria-label="Executive analytics KPIs"
      className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      {cards.map((card) => (
        <div key={card.label} className="min-w-0 space-y-1">
          <CeoStatCard
            label={card.label}
            value={card.value}
            accent={card.accent}
          />
          {card.hint ? (
            <p className="px-1 text-[10px] text-muted-foreground">{card.hint}</p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
