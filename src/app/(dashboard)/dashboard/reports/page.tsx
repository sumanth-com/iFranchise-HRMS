import { ReportsDashboardPanels } from "@/components/reports/reports-dashboard-panels";
import { getExecutiveDashboard } from "@/lib/reports/services/reports-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsDashboardPage() {
  const profile = await requireServerPermission("reports.view");
  const supabase = await createClient();
  const dashboard = await getExecutiveDashboard(supabase, profile);

  return <ReportsDashboardPanels dashboard={dashboard} />;
}
