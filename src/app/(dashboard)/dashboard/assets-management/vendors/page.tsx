import { VendorsManagement } from "@/components/assets/vendors-management";
import { listVendors } from "@/lib/assets/services/asset-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function AssetVendorsPage() {
  const profile = await requireServerPermission("asset.view");
  const supabase = await createClient();
  const vendors = await listVendors(supabase, profile);

  return (
    <VendorsManagement vendors={vendors} permissionCodes={profile.permissionCodes} />
  );
}
