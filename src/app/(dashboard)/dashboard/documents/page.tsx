import { DocumentsExplorer } from "@/components/employee/documents/documents-explorer";
import { getEmployeeDocumentsExplorer } from "@/lib/employee/services/employee-documents-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function DocumentsSelfServicePage() {
  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();
  const data = await getEmployeeDocumentsExplorer(supabase, profile);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Securely store, organize and manage your personal and company documents.
        </p>
      </div>
      <DocumentsExplorer data={data} />
    </div>
  );
}
