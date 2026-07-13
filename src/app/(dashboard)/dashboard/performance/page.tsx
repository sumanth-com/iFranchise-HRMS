import { PerformanceDashboardPanels } from "@/components/performance/performance-dashboard-panels";
import { PerformanceSummaryCards } from "@/components/performance/performance-summary-cards";
import { createClient } from "@/lib/supabase/server";
import { getPerformanceSummary } from "@/lib/performance/services/performance-queries";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function PerformanceDashboardPage() {
  const profile = await requireServerPermission("performance.view");
  const supabase = await createClient();
  const summary = await getPerformanceSummary(supabase, profile);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor goals, KPIs, reviews, feedback, and promotion readiness across your organization.
        </p>
      </div>

      <PerformanceSummaryCards summary={summary} />
      <PerformanceDashboardPanels summary={summary} />
    </div>
  );
}
