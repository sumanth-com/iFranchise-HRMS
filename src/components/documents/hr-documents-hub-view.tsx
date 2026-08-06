"use client";

import { DocumentsExplorer } from "@/components/employee/documents/documents-explorer";
import { ClientSectionBoundary } from "@/components/common/client-section-boundary";
import { ErrorState } from "@/components/common/error-state";
import { HrTeamDocumentsView } from "@/components/documents/hr-team-documents-view";
import type { EmployeeDocumentsExplorerData } from "@/types/employee-documents-explorer";
import type { DocumentsSummary } from "@/types/documents";

type DocumentsSection = "my" | "team";

type Props = {
  initialSection?: DocumentsSection;
  canViewTeam: boolean;
  selfDocuments: EmployeeDocumentsExplorerData;
  teamDocuments: DocumentsSummary;
  loadError?: string | null;
};

export function HrDocumentsHubView({
  initialSection = "my",
  canViewTeam,
  selfDocuments,
  teamDocuments,
  loadError = null,
}: Props) {
  const section = initialSection === "team" && canViewTeam ? "team" : "my";
  const isTeamView = section === "team";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isTeamView ? "HR Documents" : "Documents"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isTeamView
            ? "Manage organization-wide HR documents, verification, and document workflows."
            : "View and upload your personal employment documents."}
        </p>
      </div>

      {loadError ? (
        <ErrorState
          title="Couldn't load documents"
          description={loadError}
          onRetry={() => window.location.reload()}
          retryLabel="Refresh page"
          className="py-8"
        />
      ) : isTeamView ? (
        <ClientSectionBoundary
          title="Couldn't load team documents"
          description="Something went wrong while loading HR documents. Please try again."
        >
          <HrTeamDocumentsView summary={teamDocuments} embedded />
        </ClientSectionBoundary>
      ) : (
        <ClientSectionBoundary
          title="Couldn't load your documents"
          description="Something went wrong while loading your documents. Please try again."
        >
          <DocumentsExplorer data={selfDocuments} />
        </ClientSectionBoundary>
      )}
    </div>
  );
}
