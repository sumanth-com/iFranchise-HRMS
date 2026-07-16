import { CeoStatCard } from "@/components/ceo/ceo-module-primitives";
import type { CeoApprovalsKpis } from "@/types/ceo-approvals";
import { cn } from "@/lib/utils";

export function CeoApprovalsSummary({ kpis }: { kpis: CeoApprovalsKpis }) {
  return (
    <section
      aria-label="Executive approval KPIs"
      className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      <CeoStatCard label="Pending" value={String(kpis.totalPending)} />
      <CeoStatCard
        label="High Priority"
        value={String(kpis.highPriority)}
        accent={kpis.highPriority > 0 ? "text-destructive" : undefined}
      />
      <CeoStatCard
        label="Overdue"
        value={String(kpis.overdueRequests)}
        accent={
          kpis.overdueRequests > 0 ? "text-amber-700 dark:text-amber-400" : undefined
        }
      />
      <CeoStatCard
        label="Escalated"
        value={String(kpis.escalatedRequests)}
        accent={
          kpis.escalatedRequests > 0
            ? "text-violet-600 dark:text-violet-400"
            : undefined
        }
      />
      <CeoStatCard
        label="Approved MTD"
        value={String(kpis.approvedThisMonth)}
        accent="text-emerald-600 dark:text-emerald-400"
      />
      <CeoStatCard
        label="Avg Time"
        value={`${kpis.averageApprovalTimeHours.toFixed(1)}h`}
        accent={cn(
          kpis.averageApprovalTimeHours > 72
            ? "text-amber-700 dark:text-amber-400"
            : undefined,
        )}
      />
    </section>
  );
}
