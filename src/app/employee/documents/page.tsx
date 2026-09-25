import { Suspense } from "react";

import { ClientSectionBoundary } from "@/components/common/client-section-boundary";
import { DocumentsExplorer } from "@/components/employee/documents/documents-explorer";
import { DocumentsExplorerSoftFallback } from "@/components/employee/documents/documents-explorer-soft-fallback";
import { DocumentsLoadError } from "@/components/employee/documents/documents-load-error";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  EMPTY_EMPLOYEE_DOCUMENTS_EXPLORER,
  getEmployeeDocumentsExplorer,
} from "@/lib/employee/services/employee-documents-queries";
import { safeServerCallWithError } from "@/lib/errors/safe-server";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/auth";

async function EmployeeDocumentsExplorerSection({
  profile,
}: {
  profile: UserProfile;
}) {
  const supabase = await createClient();
  const { data, error } = await safeServerCallWithError(
    () => getEmployeeDocumentsExplorer(supabase, profile),
    EMPTY_EMPLOYEE_DOCUMENTS_EXPLORER,
    "[employee/documents] explorer",
  );

  if (error) return <DocumentsLoadError message={error} />;

  return (
    <ClientSectionBoundary
      title="Couldn't load your documents"
      description="We couldn't load this section. Please try again."
    >
      <DocumentsExplorer data={data} />
    </ClientSectionBoundary>
  );
}

export default async function EmployeeDocumentsPage() {
  // Auth/permission only in the outer shell so soft-nav can paint cached
  // explorer content while the explorer query resolves.
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "documents.view",
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Securely store, organize and manage your personal and company documents.
          </p>
        </div>
        <Suspense fallback={<DocumentsExplorerSoftFallback />}>
          <EmployeeDocumentsExplorerSection profile={profile} />
        </Suspense>
      </div>
    </div>
  );
}
