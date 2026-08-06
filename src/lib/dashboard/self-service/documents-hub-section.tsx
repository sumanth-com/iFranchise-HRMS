import { HrDocumentsHubView } from "@/components/documents/hr-documents-hub-view";
import { getDocumentsSummary } from "@/lib/documents/services/document-queries";
import {
  EMPTY_EMPLOYEE_DOCUMENTS_EXPLORER,
  getEmployeeDocumentsExplorer,
} from "@/lib/employee/services/employee-documents-queries";
import { safeServerCallWithError } from "@/lib/errors/safe-server";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";
import type { DocumentsSummary } from "@/types/documents";

const TEAM_DOCUMENTS_PERMISSIONS = [
  "documents.view",
  "documents.manage",
  "documents.verify",
] as const;

const EMPTY_TEAM_SUMMARY: DocumentsSummary = {
  totalDocuments: 0,
  pendingVerification: 0,
  expiringSoon: 0,
  generatedThisMonth: 0,
  uploadedToday: 0,
  documentsByType: [],
  recentActivity: [],
  recentUploads: [],
};

export async function DocumentsHubSection({
  section,
  searchParams,
}: {
  section: "my" | "team";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();
  void (await searchParams);
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [...TEAM_DOCUMENTS_PERMISSIONS]);

  const selfResult = await safeServerCallWithError(
    () => getEmployeeDocumentsExplorer(supabase, profile),
    EMPTY_EMPLOYEE_DOCUMENTS_EXPLORER,
    "[dashboard/documents] self explorer",
  );

  const teamResult = canViewTeam
    ? await safeServerCallWithError(
        () => getDocumentsSummary(supabase, profile),
        EMPTY_TEAM_SUMMARY,
        "[dashboard/documents] team summary",
      )
    : { data: EMPTY_TEAM_SUMMARY, error: null };

  const loadError =
    section === "team" && canViewTeam ? teamResult.error : selfResult.error;

  return (
    <HrDocumentsHubView
      initialSection={section}
      canViewTeam={canViewTeam}
      selfDocuments={selfResult.data}
      teamDocuments={teamResult.data}
      loadError={loadError}
    />
  );
}
