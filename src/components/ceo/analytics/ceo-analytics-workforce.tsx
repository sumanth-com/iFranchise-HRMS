import {
  CeoChartPanel,
  CeoStatCard,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoAnalyticsWorkforce } from "@/types/ceo-analytics";

export function CeoAnalyticsWorkforcePanel({
  workforce,
}: {
  workforce: CeoAnalyticsWorkforce;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Workforce Analytics</h2>
        <p className="text-xs text-muted-foreground">
          Headcount, demographics, tenure, joining and exit trends.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CeoStatCard
          label="Average Employee Tenure"
          value={`${workforce.averageTenureYears.toFixed(1)} yrs`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <CeoChartPanel title="Headcount Growth" items={workforce.headcountGrowth} />
        <CeoChartPanel
          title="Department Growth"
          items={workforce.departmentGrowth}
          color="bg-sky-500"
        />
        <CeoChartPanel
          title="Manager Distribution"
          items={workforce.managerDistribution}
          color="bg-indigo-500"
        />
        <CeoChartPanel
          title="Employment Type Distribution"
          items={workforce.employmentTypeDistribution}
          color="bg-violet-500"
        />
        <CeoChartPanel
          title="Gender Distribution"
          items={workforce.genderDistribution}
          color="bg-fuchsia-500"
        />
        {workforce.ageDistribution.length > 0 ? (
          <CeoChartPanel
            title="Age Distribution"
            items={workforce.ageDistribution}
            color="bg-amber-500"
          />
        ) : null}
        <CeoChartPanel
          title="Joining Trend"
          items={workforce.joiningTrend}
          color="bg-emerald-500"
        />
        <CeoChartPanel
          title="Exit Trend"
          items={workforce.exitTrend}
          color="bg-rose-500"
        />
      </div>
    </section>
  );
}
