import { Suspense } from "react";

import { CeoUserProvisioningView } from "@/components/ceo/user-provisioning/ceo-user-provisioning-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getCeoUserProvisioningModuleData } from "@/lib/ceo/actions/ceo-user-provisioning-actions";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { ceoProvisioningListParamsSchema } from "@/lib/validations/ceo-user-provisioning";

type CeoUserProvisioningPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CeoUserProvisioningPage({
  searchParams,
}: CeoUserProvisioningPageProps) {
  await requireServerAnyPermission([
    PORTAL_PERMISSIONS.ceo,
    "user_provisioning.view",
    "user_provisioning.manage",
  ]);
  const rawParams = await searchParams;

  const parsed = ceoProvisioningListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize) ?? "8",
    search: firstString(rawParams.search),
    roleCode: firstString(rawParams.roleCode),
    invitationStatus: firstString(rawParams.invitationStatus),
  });

  const data = await getCeoUserProvisioningModuleData(parsed);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoUserProvisioningView {...data} initialFilters={parsed} />
    </Suspense>
  );
}
