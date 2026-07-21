"use client";

import { useState } from "react";

import { Button } from "@/components/common/button";
import { DocumentsExplorer } from "@/components/employee/documents/documents-explorer";
import { HrTeamDocumentsView } from "@/components/documents/hr-team-documents-view";
import type { EmployeeDocumentsExplorerData } from "@/types/employee-documents-explorer";
import type { DocumentsSummary } from "@/types/documents";

type DocumentsSection = "my" | "team";

type Props = {
  initialSection?: DocumentsSection;
  canViewTeam: boolean;
  selfDocuments: EmployeeDocumentsExplorerData;
  teamDocuments: DocumentsSummary;
};

export function HrDocumentsHubView({
  initialSection = "my",
  canViewTeam,
  selfDocuments,
  teamDocuments,
}: Props) {
  const sectionDefault =
    initialSection === "team" && canViewTeam ? "team" : "my";
  const [section, setSection] = useState<DocumentsSection>(sectionDefault);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal documents and organization-wide HR document workflows.
          </p>
        </div>
        {canViewTeam ? (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
            <Button
              size="sm"
              variant={section === "my" ? "default" : "ghost"}
              onClick={() => setSection("my")}
            >
              My Documents
            </Button>
            <Button
              size="sm"
              variant={section === "team" ? "default" : "ghost"}
              onClick={() => setSection("team")}
            >
              HR Documents
            </Button>
          </div>
        ) : null}
      </div>

      {section === "my" || !canViewTeam ? (
        <DocumentsExplorer data={selfDocuments} />
      ) : (
        <HrTeamDocumentsView summary={teamDocuments} embedded />
      )}
    </div>
  );
}
