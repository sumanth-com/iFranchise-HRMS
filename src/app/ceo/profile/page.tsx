import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CeoProfileView } from "@/components/ceo/profile/ceo-profile-view";
import { getCeoProfileModuleData } from "@/lib/ceo/actions/ceo-profile-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function CeoProfilePage() {
  await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const data = await getCeoProfileModuleData();

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoProfileView {...data} />
    </Suspense>
  );
}
