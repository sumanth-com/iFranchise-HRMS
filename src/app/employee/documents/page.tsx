import { DocumentsExplorer } from "@/components/employee/documents/documents-explorer";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getEmployeeDocumentsExplorer } from "@/lib/employee/services/employee-documents-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeDocumentsPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "documents.view",
  ]);
  const supabase = await createClient();
  const data = await getEmployeeDocumentsExplorer(supabase, profile);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Securely store, organize and manage your personal and company documents.
          </p>
        </div>
        <DocumentsExplorer data={data} />
      </div>
    </div>
  );
}
