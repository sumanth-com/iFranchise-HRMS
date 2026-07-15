import { CeoStatCard } from "@/components/ceo/ceo-module-primitives";
import type { CeoReportsKpis } from "@/types/ceo-reports";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CeoReportsSummary({ kpis }: { kpis: CeoReportsKpis }) {
  return (
    <section
      aria-label="Executive reports KPIs"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4"
    >
      <CeoStatCard
        label="Total Reports Generated"
        value={String(kpis.totalReportsGenerated)}
      />
      <CeoStatCard label="Scheduled Reports" value={String(kpis.scheduledReports)} />
      <CeoStatCard
        label="Reports Generated This Month"
        value={String(kpis.reportsGeneratedThisMonth)}
      />
      <CeoStatCard
        label="Most Downloaded Report"
        value={kpis.mostDownloadedReport ?? "—"}
      />
      <CeoStatCard
        label="Last Generated Report"
        value={kpis.lastGeneratedReport ?? "—"}
      />
      <CeoStatCard
        label="Next Scheduled Report"
        value={kpis.nextScheduledReport ?? "—"}
      />
      <CeoStatCard
        label="Failed Report Jobs"
        value={String(kpis.failedReportJobs)}
        accent={kpis.failedReportJobs > 0 ? "text-destructive" : undefined}
      />
      <CeoStatCard
        label="Report Storage Usage"
        value={formatBytes(kpis.reportStorageUsageBytes)}
      />
    </section>
  );
}
