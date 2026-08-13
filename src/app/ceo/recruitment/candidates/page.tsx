import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { CandidatesManagement } from "@/components/recruitment/candidates-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import {
  getCandidateById,
  getRecruitmentLookups,
  listCandidates,
} from "@/lib/recruitment/services/recruitment-queries";
import { createClient } from "@/lib/supabase/server";
import { candidateListParamsSchema } from "@/lib/validations/recruitment";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function CeoCandidatesPageContent({ searchParams }: PageProps) {
  const profile = await requireCeoPortal();
  const supabase = await createClient();
  const raw = await searchParams;

  const params = candidateListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    departmentId: raw.departmentId,
    jobOpeningId: raw.jobOpeningId,
    stage: raw.stage,
  });

  const candidateId = typeof raw.candidateId === "string" ? raw.candidateId : undefined;

  const [result, lookups, selected] = await Promise.all([
    listCandidates(supabase, profile, params),
    getRecruitmentLookups(supabase, profile.employee.organizationId),
    candidateId
      ? getCandidateById(supabase, profile.employee.organizationId, candidateId)
      : Promise.resolve(null),
  ]);

  return (
    <CandidatesManagement
      records={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      lookups={lookups}
      initialSelected={selected}
      canCreate={false}
      canEdit={false}
      canInterview={false}
      canOffer={false}
      filters={{
        search: params.search,
        departmentId: params.departmentId,
        jobOpeningId: params.jobOpeningId,
        stage: params.stage,
      }}
    />
  );
}

export default function CeoCandidatesPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CeoCandidatesPageContent searchParams={searchParams} />
    </Suspense>
  );
}
