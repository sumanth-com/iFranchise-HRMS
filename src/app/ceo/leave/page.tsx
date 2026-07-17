import { Suspense } from "react";

import { CeoLeaveView } from "@/components/ceo/leave/ceo-leave-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getCeoLeaveModuleData } from "@/lib/ceo/actions/ceo-leave-actions";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function CeoLeavePage() {
  await requireServerAnyPermission([PORTAL_PERMISSIONS.ceo, "leave.view"]);
  const data = await getCeoLeaveModuleData();

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoLeaveView {...data} />
    </Suspense>
  );
}
