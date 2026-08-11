"use client";

import { DocumentsExplorer } from "@/components/employee/documents/documents-explorer";
import { ClientSectionBoundary } from "@/components/common/client-section-boundary";
import { ErrorState } from "@/components/common/error-state";
import { DocumentsSubNav } from "@/components/documents/documents-sub-nav";
import { HrTeamDocumentsView } from "@/components/documents/hr-team-documents-view";
import type { EmployeeDocumentsExplorerData } from "@/types/employee-documents-explorer";
import {
  SELF_DOCUMENTS_ROUTES,
  parseTeamDocumentsSection,
  teamDocumentsSectionDescription,
} from "@/lib/documents/constants";
import type { DocumentsSummary, EmployeeDocumentItem } from "@/types/documents";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type DocumentsSection = "my" | "team";

type Props = {
  initialSection?: DocumentsSection;
  canViewTeam: boolean;
  selfDocuments: EmployeeDocumentsExplorerData;
  teamDocuments: DocumentsSummary;
  pendingQueue?: EmployeeDocumentItem[];
  pendingTotal?: number;
  loadError?: string | null;
  children?: ReactNode;
};

export function HrDocumentsHubView({
  initialSection = "my",
  canViewTeam,
  selfDocuments,
  teamDocuments,
  pendingQueue = [],
  pendingTotal = 0,
  loadError = null,
  children,
}: Props) {
  const pathname = usePathname();
  const section = initialSection === "team" && canViewTeam ? "team" : "my";
  const isTeamView = section === "team";

  const teamDocumentsSection =
    pathname === SELF_DOCUMENTS_ROUTES.team
      ? "overview"
      : parseTeamDocumentsSection(
          pathname.slice(SELF_DOCUMENTS_ROUTES.team.length + 1).split("/")[0],
        ) ?? "overview";

  const isOverview = isTeamView && teamDocumentsSection === "overview";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="space-y-3">
        {isTeamView ? <DocumentsSubNav /> : null}

        <h1 className="text-2xl font-semibold tracking-tight">
          {isTeamView ? "Team Documents" : "Documents"}
        </h1>

        <p className="max-w-3xl text-sm text-muted-foreground">
          {isTeamView
            ? teamDocumentsSectionDescription(teamDocumentsSection)
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
          {isOverview ? (
            <HrTeamDocumentsView
              summary={teamDocuments}
              pendingQueue={pendingQueue}
              pendingTotal={pendingTotal}
              embedded
            />
          ) : null}
          {children}
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
