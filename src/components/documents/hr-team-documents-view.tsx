"use client";

import {
  DocumentsDashboardPanels,
  DocumentsSummaryCards,
} from "@/components/documents/documents-dashboard-panels";
import type { DocumentsSummary, EmployeeDocumentItem } from "@/types/documents";

type HrTeamDocumentsViewProps = {
  summary: DocumentsSummary;
  pendingQueue?: EmployeeDocumentItem[];
  pendingTotal?: number;
  embedded?: boolean;
};

export function HrTeamDocumentsView({
  summary,
  pendingQueue = [],
  pendingTotal = 0,
  embedded = false,
}: HrTeamDocumentsViewProps) {
  return (
    <div className="space-y-6">
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track employee files, company letters, expiring credentials, and verification status.
          </p>
        </div>
      ) : null}

      <DocumentsSummaryCards summary={summary} />

      <DocumentsDashboardPanels
        summary={summary}
        pendingQueue={pendingQueue}
        pendingTotal={pendingTotal}
      />
    </div>
  );
}
