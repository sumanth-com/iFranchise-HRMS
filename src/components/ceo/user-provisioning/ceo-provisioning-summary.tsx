import { CeoStatCard } from "@/components/ceo/ceo-module-primitives";
import type { CeoProvisioningSummary } from "@/types/ceo-user-provisioning";

export function CeoProvisioningSummaryCards({
  summary,
}: {
  summary: CeoProvisioningSummary;
}) {
  return (
    <section
      aria-label="Executive user summary"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8"
    >
      <CeoStatCard
        label="Executive Users"
        value={String(summary.totalExecutiveUsers)}
      />
      <CeoStatCard
        label="Pending"
        value={String(summary.pendingInvitations)}
        accent={summary.pendingInvitations > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
      />
      <CeoStatCard
        label="Accepted"
        value={String(summary.acceptedInvitations)}
        accent={summary.acceptedInvitations > 0 ? "text-emerald-600 dark:text-emerald-400" : undefined}
      />
      <CeoStatCard
        label="Expired"
        value={String(summary.expiredInvitations)}
        accent={summary.expiredInvitations > 0 ? "text-orange-600 dark:text-orange-400" : undefined}
      />
      <CeoStatCard label="Active Managers" value={String(summary.activeManagers)} />
      <CeoStatCard label="Active HR Users" value={String(summary.activeHrUsers)} />
      <CeoStatCard label="Co-Founders" value={String(summary.coFounders)} />
      <CeoStatCard label="Founders" value={String(summary.founders)} />
    </section>
  );
}
