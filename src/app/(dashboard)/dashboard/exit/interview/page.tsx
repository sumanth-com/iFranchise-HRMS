import { InterviewManagement } from "@/components/exit/interview-management";
import { listClearanceQueue } from "@/lib/exit/services/exit-queries";
import { isHrAdmin } from "@/lib/exit/services/exit-utils";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ExitInterviewPage() {
  const profile = await requireServerPermission("exit.view");
  const supabase = await createClient();
  const queue = await listClearanceQueue(supabase, profile);

  return (
    <InterviewManagement
      queue={queue}
      permissionCodes={profile.permissionCodes}
      isHrAdmin={isHrAdmin(profile)}
    />
  );
}
