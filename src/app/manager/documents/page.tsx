import { ClientSectionBoundary } from "@/components/common/client-section-boundary";
import { DocumentsExplorer } from "@/components/employee/documents/documents-explorer";
import { DocumentsLoadError } from "@/components/employee/documents/documents-load-error";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  EMPTY_EMPLOYEE_DOCUMENTS_EXPLORER,
  getEmployeeDocumentsExplorer,
} from "@/lib/employee/services/employee-documents-queries";
import { safeServerCallWithError } from "@/lib/errors/safe-server";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ManagerDocumentsPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "documents.view",
  ]);
  const supabase = await createClient();

  const { data, error } = await safeServerCallWithError(
    () => getEmployeeDocumentsExplorer(supabase, profile),
    EMPTY_EMPLOYEE_DOCUMENTS_EXPLORER,
    "[manager/documents] explorer",
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Securely store, organize and manage your personal and company documents.
          </p>
        </div>
        {error ? <DocumentsLoadError message={error} /> : (
          <ClientSectionBoundary
            title="Couldn't load your documents"
            description="Something went wrong while loading your documents. Please try again."
          >
            <DocumentsExplorer data={data} />
          </ClientSectionBoundary>
        )}
      </div>
    </div>
  );
}
