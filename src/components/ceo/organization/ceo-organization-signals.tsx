import { CeoStatCard } from "@/components/ceo/ceo-module-primitives";
import type { CeoOrgWorkforceInsights } from "@/types/ceo-organization";

export function CeoOrganizationSignals({
  insights,
}: {
  insights: CeoOrgWorkforceInsights;
}) {
  return (
    <section aria-label="Workforce signals" className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Workforce Signals</h2>
        <p className="text-xs text-muted-foreground">
          People changes and attention areas for the selected scope.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CeoStatCard
          label="New Joiners (This Month)"
          value={String(insights.newJoinersThisMonth)}
          accent={
            insights.newJoinersThisMonth > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : undefined
          }
        />
        <CeoStatCard
          label="On Probation"
          value={String(insights.employeesOnProbation)}
          accent={
            insights.employeesOnProbation > 0
              ? "text-amber-600 dark:text-amber-400"
              : undefined
          }
        />
        <CeoStatCard
          label="On Notice / Exiting"
          value={String(insights.employeesOnNotice)}
          accent={insights.employeesOnNotice > 0 ? "text-destructive" : undefined}
        />
        <CeoStatCard
          label="Avg Experience"
          value={
            insights.averageExperienceYears != null
              ? `${insights.averageExperienceYears} yr`
              : "—"
          }
        />
      </div>
    </section>
  );
}
