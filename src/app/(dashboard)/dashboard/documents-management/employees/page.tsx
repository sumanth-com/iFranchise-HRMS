import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmployeeDocumentsManagement } from "@/components/documents/employee-documents-management";
import { createClient } from "@/lib/supabase/server";
import { listDocumentEmployeeCards } from "@/lib/documents/services/document-queries";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function EmployeeDocumentsPage() {
  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();

  let employees: Awaited<ReturnType<typeof listDocumentEmployeeCards>> = [];
  try {
    employees = await listDocumentEmployeeCards(supabase, profile);
  } catch (error) {
    console.error("Failed to load employee document cards:", error);
  }

  return <EmployeeDocumentsManagement employees={employees} />;
}
