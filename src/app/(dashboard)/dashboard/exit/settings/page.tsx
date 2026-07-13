import { ExitSettingsForm } from "@/components/exit/exit-settings-form";
import { canExitSettings } from "@/lib/exit/constants";
import { getExitSettings } from "@/lib/exit/services/exit-settings";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ExitSettingsPage() {
  const profile = await requireServerPermission("exit.view");
  const supabase = await createClient();
  const settings = await getExitSettings(supabase, profile.employee.organizationId);
  const canEdit = canExitSettings(profile.permissionCodes);

  return <ExitSettingsForm settings={settings} canEdit={canEdit} />;
}
