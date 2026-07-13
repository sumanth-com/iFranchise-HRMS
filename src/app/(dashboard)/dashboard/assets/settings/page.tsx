import { AssetsSettingsForm } from "@/components/assets/assets-settings-form";
import { canManageAssetSettings } from "@/lib/assets/constants";
import { getAssetSettings } from "@/lib/assets/services/asset-settings";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function AssetsSettingsPage() {
  const profile = await requireServerPermission("asset.view");
  const supabase = await createClient();
  const settings = await getAssetSettings(supabase, profile.employee.organizationId);
  const canEdit = canManageAssetSettings(profile.permissionCodes);

  return <AssetsSettingsForm settings={settings} canEdit={canEdit} />;
}
