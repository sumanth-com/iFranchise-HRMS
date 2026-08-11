import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HrDocumentsHubView } from "@/components/documents/hr-documents-hub-view";
import { TeamDocumentsContentSkeleton } from "@/components/documents/team-documents-content-skeleton";
import { TeamDocumentsSection } from "@/components/documents/team-documents-section";
import { legacyHubTabRedirectUrl } from "@/lib/dashboard/hub-paths";
import { safeServerCallWithError } from "@/lib/errors/safe-server";
import {
  getDocumentsSummary,
  listEmployeeDocuments,
} from "@/lib/documents/services/document-queries";
import {
  EMPTY_EMPLOYEE_DOCUMENTS_EXPLORER,
  getEmployeeDocumentsExplorer,
} from "@/lib/employee/services/employee-documents-queries";
import { SELF_DOCUMENTS_ROUTES, type TeamDocumentsSection as TeamDocumentsSectionKey } from "@/lib/documents/constants";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";
import type { DocumentsSummary, EmployeeDocumentItem } from "@/types/documents";

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
  section: "my";
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

  return (
    <HrDocumentsHubView
      initialSection="my"
      canViewTeam={canViewTeam}
      selfDocuments={selfResult.data}
      teamDocuments={EMPTY_TEAM_SUMMARY}
      pendingQueue={[]}
      loadError={selfResult.error}
    />
  );
}

type TeamPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  teamSection?: TeamDocumentsSectionKey | null;
};

export async function DocumentsTeamPage({
  searchParams,
  teamSection = null,
}: TeamPageProps) {
  const raw = await searchParams;
  const legacy = legacyHubTabRedirectUrl(SELF_DOCUMENTS_ROUTES.list, raw);
  if (legacy) redirect(legacy);

  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [...TEAM_DOCUMENTS_PERMISSIONS]);

  const [teamResult, pendingResult] = await Promise.all([
    safeServerCallWithError(
      () => getDocumentsSummary(supabase, profile),
      EMPTY_TEAM_SUMMARY,
      "[dashboard/documents] team summary",
    ),
    teamSection === null
      ? safeServerCallWithError(
          () =>
            listEmployeeDocuments(supabase, profile, {
              page: 1,
              pageSize: 8,
              documentStatus: "pending",
            }),
          { data: [] as EmployeeDocumentItem[], total: 0, page: 1, pageSize: 8 },
          "[dashboard/documents] pending queue",
        )
      : Promise.resolve({ data: { data: [] as EmployeeDocumentItem[], total: 0, page: 1, pageSize: 8 }, error: null }),
  ]);

  return (
    <HrDocumentsHubView
      initialSection="team"
      canViewTeam={canViewTeam}
      selfDocuments={EMPTY_EMPLOYEE_DOCUMENTS_EXPLORER}
      teamDocuments={teamResult.data}
      pendingQueue={pendingResult.data.data}
      pendingTotal={pendingResult.data.total}
      loadError={teamResult.error}
    >
      {teamSection ? (
        <Suspense fallback={<TeamDocumentsContentSkeleton />}>
          <TeamDocumentsSection
            section={teamSection}
            rawSearchParams={raw}
            profile={profile}
            supabase={supabase}
          />
        </Suspense>
      ) : null}
    </HrDocumentsHubView>
  );
}
