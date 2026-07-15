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
  const cards: {
    label: string;
    value: string;
    accent?: string;
    hint?: string | null;
  }[] = [
    {
      label: "Company Health Score",
      value: String(kpis.companyHealthScore),
      hint: deltaHint(kpis.companyHealthScore, kpis.previous?.companyHealthScore),
    },
    {
      label: "Workforce Growth",
      value: formatCeoPercent(kpis.workforceGrowthPercent),
      hint: deltaHint(
        kpis.workforceGrowthPercent,
        kpis.previous?.workforceGrowthPercent,
      ),
    },
    {
      label: "Employee Retention Rate",
      value: formatCeoPercent(kpis.employeeRetentionRate),
      accent: "text-emerald-600 dark:text-emerald-400",
      hint: deltaHint(
        kpis.employeeRetentionRate,
        kpis.previous?.employeeRetentionRate,
      ),
    },
    {
      label: "Attrition Rate",
      value: formatCeoPercent(kpis.attritionRate),
      accent: kpis.attritionRate >= 8 ? "text-destructive" : undefined,
      hint: deltaHint(kpis.attritionRate, kpis.previous?.attritionRate),
    },
    {
      label: "Hiring Success Rate",
      value: formatCeoPercent(kpis.hiringSuccessRate),
      hint: deltaHint(kpis.hiringSuccessRate, kpis.previous?.hiringSuccessRate),
    },
    {
      label: "Attendance Compliance",
      value: formatCeoPercent(kpis.attendanceCompliancePercent),
      hint: deltaHint(
        kpis.attendanceCompliancePercent,
        kpis.previous?.attendanceCompliancePercent,
      ),
    },
    {
      label: "Performance Index",
      value: String(kpis.performanceIndex),
      hint: deltaHint(kpis.performanceIndex, kpis.previous?.performanceIndex),
    },
    {
      label: "Payroll Growth",
      value: formatCeoPercent(kpis.payrollGrowthPercent),
      accent:
        kpis.payrollGrowthPercent >= 5
          ? "text-amber-600 dark:text-amber-400"
          : undefined,
      hint: deltaHint(kpis.payrollGrowthPercent, kpis.previous?.payrollGrowthPercent),
    },
    {
      label: "Goal Achievement",
      value: formatCeoPercent(kpis.goalAchievementPercent),
      hint: deltaHint(
        kpis.goalAchievementPercent,
        kpis.previous?.goalAchievementPercent,
      ),
    },
  ];

  if (kpis.employeeSatisfaction != null) {
    cards.push({
      label: "Employee Satisfaction",
      value: formatCeoPercent(kpis.employeeSatisfaction),
      hint: "From exit interview ratings",
    });
  }

  return (
    <section
      aria-label="Executive analytics KPIs"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5"
    >
      {cards.map((card) => (
        <div key={card.label} className="space-y-1">
          <CeoStatCard label={card.label} value={card.value} accent={card.accent} />
          {card.hint ? (
            <p className="px-1 text-[10px] text-muted-foreground">{card.hint}</p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
