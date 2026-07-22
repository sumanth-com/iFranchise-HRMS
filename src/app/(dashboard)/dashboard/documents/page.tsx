import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { HrDocumentsHubView } from "@/components/documents/hr-documents-hub-view";
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

async function DocumentsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
  );
}

export default function DocumentsSelfServicePage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocumentsContent searchParams={searchParams} />
    </Suspense>
  );
}
