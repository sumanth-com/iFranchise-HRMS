import { Suspense } from "react";

import { CeoExitApprovalsView } from "@/components/ceo/exit/ceo-exit-approvals-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { listResignations } from "@/lib/exit/services/exit-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function CeoExitPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.ceo,
    "exit.view",
    "exit.approve",
  ]);
  const supabase = await createClient();
  const result = await listResignations(supabase, profile, {
    page: 1,
    pageSize: 100,
    exitStatus: "hr_approved",
  });

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
        <CeoExitApprovalsView pending={result.data} />
      </div>
    </Suspense>
  );
}
