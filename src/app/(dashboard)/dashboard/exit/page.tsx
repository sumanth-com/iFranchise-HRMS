import {
  ExitDashboardPanels,
  ExitSummaryCards,
} from "@/components/exit/exit-dashboard-panels";
import { getExitSummary } from "@/lib/exit/services/exit-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ExitDashboardPage() {
  const profile = await requireServerPermission("exit.view");
  const supabase = await createClient();
  const summary = await getExitSummary(supabase, profile);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Offboarding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track resignations, clearance, settlements, and exit documentation.
        </p>
      </div>
      <ExitSummaryCards summary={summary} />
      <ExitDashboardPanels summary={summary} />
    </>
  );
}
