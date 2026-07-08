import { ClearanceManagement } from "@/components/exit/clearance-management";
import { listClearanceQueue } from "@/lib/exit/services/exit-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ExitClearancePage() {
  const profile = await requireServerPermission("exit.view");
  const supabase = await createClient();
  const queue = await listClearanceQueue(supabase, profile);

  return (
    <ClearanceManagement queue={queue} permissionCodes={profile.permissionCodes} />
  );
}
