import { Suspense } from "react";

import { CeoUserProvisioningView } from "@/components/ceo/user-provisioning/ceo-user-provisioning-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { getCeoUserProvisioningModuleData } from "@/lib/ceo/actions/ceo-user-provisioning-actions";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { USER_PROVISIONING_VIEW_PERMISSIONS } from "@/lib/user-provisioning/constants";
import { ceoProvisioningListParamsSchema } from "@/lib/validations/ceo-user-provisioning";

type HrUserProvisioningPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function HrUserProvisioningPage({
  searchParams,
}: HrUserProvisioningPageProps) {
  await requireServerAnyPermission([...USER_PROVISIONING_VIEW_PERMISSIONS]);
  const rawParams = await searchParams;

  const parsed = ceoProvisioningListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize) ?? "8",
    search: firstString(rawParams.search),
    roleCode: firstString(rawParams.roleCode),
    departmentId: firstString(rawParams.departmentId),
    branchId: firstString(rawParams.branchId),
    portalKey: firstString(rawParams.portalKey),
    employmentTypeId: firstString(rawParams.employmentTypeId),
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
      <CeoUserProvisioningView {...data} initialFilters={parsed} variant="hr" />
    </Suspense>
  );
}
