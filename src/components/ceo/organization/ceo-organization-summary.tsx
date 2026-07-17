import { CeoStatCard, formatCeoPercent } from "@/components/ceo/ceo-module-primitives";
import type { CeoOrgSummary } from "@/types/ceo-organization";

export function CeoOrganizationSummary({ summary }: { summary: CeoOrgSummary }) {
  return (
    <section
      aria-label="Organization summary"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"
    >
      <CeoStatCard label="Total Employees" value={String(summary.totalEmployees)} />
      <CeoStatCard label="Departments" value={String(summary.departments)} />
      <CeoStatCard label="Managers" value={String(summary.managers)} />
      <CeoStatCard label="Team Leads" value={String(summary.teamLeads)} />
      <CeoStatCard
        label="Reporting Coverage"
        value={formatCeoPercent(summary.reportingCoveragePercent)}
      />
      <CeoStatCard label="Avg Team Size" value={String(summary.averageTeamSize)} />
    </section>
  );
}
