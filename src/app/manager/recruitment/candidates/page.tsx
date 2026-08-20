import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { CandidatesManagement } from "@/components/recruitment/candidates-management";
import { loadManagerRecruitmentPage } from "@/lib/manager/load-admin-context";
import {
  getCandidateById,
  listCandidates,
} from "@/lib/recruitment/services/recruitment-queries";
import { candidateListParamsSchema } from "@/lib/validations/recruitment";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function ManagerCandidatesPageContent({ searchParams }: PageProps) {
  const { profile, supabase, lookups } = await loadManagerRecruitmentPage();
  const raw = await searchParams;
  const now = new Date();
  const monthRaw = typeof raw.month === "string" ? raw.month : undefined;
  const yearRaw = typeof raw.year === "string" ? raw.year : undefined;

  const params = candidateListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    departmentId: raw.departmentId,
    jobOpeningId: raw.jobOpeningId,
    stage: raw.stage,
    month:
      monthRaw && monthRaw !== "all" ? monthRaw : monthRaw === undefined ? now.getMonth() + 1 : undefined,
    year:
      yearRaw && yearRaw !== "all" ? yearRaw : yearRaw === undefined ? now.getFullYear() : undefined,
  });

  const candidateId = typeof raw.candidateId === "string" ? raw.candidateId : undefined;

  const [result, selected] = await Promise.all([
    listCandidates(supabase, profile, params),
    candidateId
      ? getCandidateById(supabase, profile.employee.organizationId, candidateId)
      : Promise.resolve(null),
  ]);

  const allowedJobIds = new Set(lookups.jobs.map((job) => job.id));
  const scopedSelected =
    selected && allowedJobIds.has(selected.jobOpeningId) ? selected : null;

  return (
    <CandidatesManagement
      records={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      lookups={lookups}
      initialSelected={scopedSelected}
      canCreate
      canEdit
      canInterview
      canOffer
      filters={{
        search: params.search,
        departmentId: params.departmentId,
        jobOpeningId: params.jobOpeningId,
        stage: params.stage,
        month:
          monthRaw === "all"
            ? "all"
            : params.month
              ? String(params.month)
              : String(now.getMonth() + 1),
        year:
          yearRaw === "all"
            ? "all"
            : params.year
              ? String(params.year)
              : String(now.getFullYear()),
      }}
    />
  );
}

export default function ManagerCandidatesPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManagerCandidatesPageContent searchParams={searchParams} />
    </Suspense>
  );
}
