import { CeoStatCard } from "@/components/ceo/ceo-module-primitives";
import type { CeoApprovalsKpis } from "@/types/ceo-approvals";

export function CeoApprovalsSummary({ kpis }: { kpis: CeoApprovalsKpis }) {
  return (
    <section
      aria-label="Executive approval KPIs"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4"
    >
      <CeoStatCard label="Total Pending Approvals" value={String(kpis.totalPending)} />
      <CeoStatCard
        label="High Priority"
        value={String(kpis.highPriority)}
        accent={kpis.highPriority > 0 ? "text-destructive" : undefined}
      />
      <CeoStatCard label="Waiting This Week" value={String(kpis.waitingThisWeek)} />
      <CeoStatCard
        label="Approved This Month"
        value={String(kpis.approvedThisMonth)}
        accent="text-emerald-600 dark:text-emerald-400"
      />
      <CeoStatCard
        label="Rejected This Month"
        value={String(kpis.rejectedThisMonth)}
        accent={kpis.rejectedThisMonth > 0 ? "text-destructive" : undefined}
      />
      <CeoStatCard
        label="Average Approval Time"
        value={`${kpis.averageApprovalTimeHours.toFixed(1)} hrs`}
      />
      <CeoStatCard
        label="Overdue Requests"
        value={String(kpis.overdueRequests)}
        accent={kpis.overdueRequests > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
      />
      <CeoStatCard label="Escalated Requests" value={String(kpis.escalatedRequests)} />
    </section>
  );
}
