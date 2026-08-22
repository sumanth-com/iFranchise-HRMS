import { Suspense } from "react";

import { CeoRegularizationApprovalsView } from "@/components/ceo/regularization/ceo-regularization-approvals-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { listCeoRegularizationApprovalQueue } from "@/lib/ceo/services/ceo-regularization-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

async function CeoRegularizationApprovalsContent() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.ceo,
    "attendance.view",
  ]);
  const supabase = await createClient();
  const approvalQueue = await listCeoRegularizationApprovalQueue(supabase, profile);

  return <CeoRegularizationApprovalsView approvalQueue={approvalQueue} />;
}

export default function CeoApprovalsRegularizationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoRegularizationApprovalsContent />
    </Suspense>
  );
}
