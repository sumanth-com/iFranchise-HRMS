import { Suspense } from "react";

import { HrDocumentsHubView } from "@/components/documents/hr-documents-hub-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { getDocumentsSummary } from "@/lib/documents/services/document-queries";
import { getEmployeeDocumentsExplorer } from "@/lib/employee/services/employee-documents-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TEAM_DOCUMENTS_PERMISSIONS = [
  "documents.view",
  "documents.manage",
  "documents.verify",
] as const;

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function parseSection(value: string | undefined): "my" | "team" {
  return value === "team" ? "team" : "my";
}

export default async function DocumentsSelfServicePage({ searchParams }: PageProps) {
  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();
  const raw = await searchParams;
  const section = parseSection(firstString(raw.tab));
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [
    ...TEAM_DOCUMENTS_PERMISSIONS,
  ]);

  const [selfDocuments, teamSummary] = await Promise.all([
    getEmployeeDocumentsExplorer(supabase, profile),
    canViewTeam ? getDocumentsSummary(supabase, profile) : Promise.resolve(null),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <HrDocumentsHubView
        initialSection={section}
        canViewTeam={canViewTeam}
        selfDocuments={selfDocuments}
        teamDocuments={
          teamSummary ?? {
            totalDocuments: 0,
            pendingVerification: 0,
            expiringSoon: 0,
            generatedThisMonth: 0,
            uploadedToday: 0,
            documentsByType: [],
            recentActivity: [],
            recentUploads: [],
          }
        }
      />
    </Suspense>
  );
}
