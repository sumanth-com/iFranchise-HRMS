import { TemplatesManagement } from "@/components/documents/templates-management";
import { createClient } from "@/lib/supabase/server";
import { listTemplates } from "@/lib/documents/services/document-queries";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function DocumentTemplatesPage() {
  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();
  const templates = await listTemplates(supabase, profile);

  return (
    <TemplatesManagement
      templates={templates}
      permissionCodes={profile.permissionCodes}
    />
  );
}
