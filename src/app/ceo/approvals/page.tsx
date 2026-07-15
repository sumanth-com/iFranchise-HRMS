import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CeoApprovalsView } from "@/components/ceo/approvals/ceo-approvals-view";
import { getCeoApprovalsModuleData } from "@/lib/ceo/actions/ceo-approvals-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";
import { ceoApprovalsListParamsSchema } from "@/lib/validations/ceo-approvals";

type CeoApprovalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CeoApprovalsPage({
  searchParams,
}: CeoApprovalsPageProps) {
  await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const rawParams = await searchParams;

  const parsed = ceoApprovalsListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize),
    search: firstString(rawParams.search),
    approvalType: firstString(rawParams.approvalType),
    priority: firstString(rawParams.priority),
    departmentId: firstString(rawParams.departmentId),
    status: firstString(rawParams.status),
    requestedById: firstString(rawParams.requestedById),
    dateFrom: firstString(rawParams.dateFrom),
    dateTo: firstString(rawParams.dateTo),
  });

  const data = await getCeoApprovalsModuleData(parsed);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoApprovalsView {...data} initialFilters={parsed} />
    </Suspense>
  );
}
