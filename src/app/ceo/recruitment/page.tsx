import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CeoRecruitmentView } from "@/components/ceo/recruitment/ceo-recruitment-view";
import { getCeoRecruitmentModuleData } from "@/lib/ceo/actions/ceo-recruitment-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";
import { ceoRecruitmentListParamsSchema } from "@/lib/validations/ceo-recruitment";

type CeoRecruitmentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CeoRecruitmentPage({
  searchParams,
}: CeoRecruitmentPageProps) {
  await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const rawParams = await searchParams;

  const parsed = ceoRecruitmentListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize),
    search: firstString(rawParams.search),
    candidateId: firstString(rawParams.candidateId),
    departmentId: firstString(rawParams.departmentId),
    jobOpeningId: firstString(rawParams.jobOpeningId),
    recruiterId: firstString(rawParams.recruiterId),
    stage: firstString(rawParams.stage),
    employmentTypeId: firstString(rawParams.employmentTypeId),
    dateFrom: firstString(rawParams.dateFrom),
    dateTo: firstString(rawParams.dateTo),
  });

  const data = await getCeoRecruitmentModuleData(parsed);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoRecruitmentView {...data} initialFilters={parsed} />
    </Suspense>
  );
}
