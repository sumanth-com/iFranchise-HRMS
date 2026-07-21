"use client";

import {
  DocumentsDashboardPanels,
  DocumentsSummaryCards,
} from "@/components/documents/documents-dashboard-panels";
import type { DocumentsSummary } from "@/types/documents";

type HrTeamDocumentsViewProps = {
  summary: DocumentsSummary;
  embedded?: boolean;
};

export function HrTeamDocumentsView({
  summary,
  embedded = false,
}: HrTeamDocumentsViewProps) {
  return (
    <div className="space-y-6">
      <div>
        {embedded ? (
          <h2 className="text-lg font-semibold tracking-tight">HR Documents</h2>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">HR Documents</h1>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Track employee files, company letters, expiring credentials, and verification status.
        </p>
      </div>
      <DocumentsSummaryCards summary={summary} />
      <DocumentsDashboardPanels summary={summary} />
    </div>
  );
}
