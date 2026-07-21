import {
  DocumentsDashboardPanels,
  DocumentsSummaryCards,
} from "@/components/documents/documents-dashboard-panels";
import { createClient } from "@/lib/supabase/server";
import { getDocumentsSummary } from "@/lib/documents/services/document-queries";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function DocumentsDashboardPage() {
  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();
  const summary = await getDocumentsSummary(supabase, profile);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HR Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track employee files, company letters, expiring credentials, and verification status.
        </p>
      </div>
      <DocumentsSummaryCards summary={summary} />
      <DocumentsDashboardPanels summary={summary} />
    </>
  );
}
