import { CeoStatCard } from "@/components/ceo/ceo-module-primitives";
import type { CeoReportsKpis } from "@/types/ceo-reports";

export function CeoReportsSummary({ kpis }: { kpis: CeoReportsKpis }) {
  return (
    <section
      aria-label="Executive reports KPIs"
      className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3"
    >
      <CeoStatCard
        label="Generated"
        value={String(kpis.reportsGeneratedThisMonth)}
      />
      <CeoStatCard
        label="Active Schedules"
        value={String(kpis.scheduledReports)}
      />
      <CeoStatCard
        label="Next Delivery"
        value={kpis.nextScheduledReport ?? "—"}
        wrapValue
      />
      <CeoStatCard
        label="Latest Report"
        value={kpis.lastGeneratedReport ?? "—"}
        wrapValue
      />
      <CeoStatCard
        label="Failed"
        value={String(kpis.failedReportJobs)}
        accent={kpis.failedReportJobs > 0 ? "text-destructive" : undefined}
      />
      <CeoStatCard
        label="Most Used"
        value={kpis.mostDownloadedReport ?? "—"}
        wrapValue
      />
    </section>
  );
}
