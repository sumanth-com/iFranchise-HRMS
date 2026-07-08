import { ExitDocumentsManagement } from "@/components/exit/exit-documents-management";
import {
  listDocumentResignations,
  listExitDocuments,
} from "@/lib/exit/services/exit-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ExitDocumentsPage() {
  const profile = await requireServerPermission("exit.view");
  const supabase = await createClient();

  const [documents, resignations] = await Promise.all([
    listExitDocuments(supabase, profile),
    listDocumentResignations(supabase, profile),
  ]);

  return (
    <ExitDocumentsManagement
      documents={documents}
      resignations={resignations}
      permissionCodes={profile.permissionCodes}
    />
  );
}
