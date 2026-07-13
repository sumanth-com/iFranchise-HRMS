import { DocumentsSettingsForm } from "@/components/documents/documents-settings-form";
import { canManageDocumentSettings } from "@/lib/documents/constants";
import { getDocumentSettings } from "@/lib/documents/services/document-settings";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function DocumentsSettingsPage() {
  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();
  const settings = await getDocumentSettings(supabase, profile.employee.organizationId);
  const canEdit = canManageDocumentSettings(profile.permissionCodes);

  return <DocumentsSettingsForm settings={settings} canEdit={canEdit} />;
}
