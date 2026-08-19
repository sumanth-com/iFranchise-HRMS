import { CeoStatCard } from "@/components/ceo/ceo-module-primitives";
import type { CeoProvisioningSummary } from "@/types/ceo-user-provisioning";

export function CeoProvisioningSummaryCards({
  summary,
}: {
  summary: CeoProvisioningSummary;
}) {
  return (
    <section
      aria-label="User provisioning summary"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
    >
      <CeoStatCard label="Executive Users" value={String(summary.executiveUsers)} />
      <CeoStatCard label="HR Users" value={String(summary.hrUsers)} />
      <CeoStatCard label="Managers" value={String(summary.managers)} />
      <CeoStatCard label="Employees" value={String(summary.employees)} />
      <CeoStatCard
        label="Deactivated"
        value={String(summary.deactivatedUsers)}
        accent={
          summary.deactivatedUsers > 0
            ? "text-orange-600 dark:text-orange-400"
            : undefined
        }
      />
    </section>
  );
}
