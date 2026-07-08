import { SettlementManagement } from "@/components/exit/settlement-management";
import { listClearanceQueue } from "@/lib/exit/services/exit-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ExitSettlementPage() {
  const profile = await requireServerPermission("exit.view");
  const supabase = await createClient();
  const queue = await listClearanceQueue(supabase, profile);

  return (
    <SettlementManagement queue={queue} permissionCodes={profile.permissionCodes} />
  );
}
