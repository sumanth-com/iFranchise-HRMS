import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerRecruitmentView } from "@/components/manager/recruitment/manager-recruitment-view";
import { getManagerTeamRecruitmentPageData } from "@/lib/manager/actions/manager-recruitment-actions";
import { requireServerPermission } from "@/lib/permissions/server";
import { teamRecruitmentListParamsSchema } from "@/lib/validations/manager-recruitment";

type ManagerRecruitmentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ManagerRecruitmentPage({
  searchParams,
}: ManagerRecruitmentPageProps) {
  const profile = await requireServerPermission("portal.manager.access");
  const rawParams = await searchParams;

  const parsed = teamRecruitmentListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize),
    search: firstString(rawParams.search),
    employeeId: firstString(rawParams.employeeId),
    jobOpeningId: firstString(rawParams.jobOpeningId),
    stage: firstString(rawParams.stage),
    departmentId: firstString(rawParams.departmentId),
    interviewStatus: firstString(rawParams.interviewStatus),
    dateFrom: firstString(rawParams.dateFrom),
    dateTo: firstString(rawParams.dateTo),
    view: firstString(rawParams.view),
  });

  const data = await getManagerTeamRecruitmentPageData(parsed);
  const candidateId = firstString(rawParams.candidateId);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ManagerRecruitmentView
        {...data}
        initialFilters={parsed}
        managerEmployeeId={profile.employee.id}
        initialCandidateId={candidateId}
      />
    </Suspense>
  );
}
