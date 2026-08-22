import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { OfferQueueManagement } from "@/components/recruitment/offer-queue-management";
import { loadManagerRecruitmentPage } from "@/lib/manager/load-admin-context";
import {
  getOfferWorkspaceCandidateById,
  listOfferQueueCandidates,
} from "@/lib/recruitment/services/recruitment-queries";
import { candidateListParamsSchema } from "@/lib/validations/recruitment";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function ManagerOffersPageContent({ searchParams }: PageProps) {
  const { profile, supabase, lookups } = await loadManagerRecruitmentPage();
  const raw = await searchParams;

  const params = candidateListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    departmentId: raw.departmentId,
    jobOpeningId: raw.jobOpeningId,
    offerQueue: typeof raw.offerQueue === "string" ? raw.offerQueue : "all",
  });

  const candidateId = typeof raw.candidateId === "string" ? raw.candidateId : undefined;

  const [result, selected] = await Promise.all([
    listOfferQueueCandidates(supabase, profile, params),
    candidateId
      ? getOfferWorkspaceCandidateById(supabase, profile.employee.organizationId, candidateId)
      : Promise.resolve(null),
  ]);

  const allowedJobIds = new Set(lookups.jobs.map((job) => job.id));
  const scopedSelected =
    selected &&
    allowedJobIds.has(selected.jobOpeningId) &&
    ["ceo", "offer"].includes(selected.stage)
      ? selected
      : null;

  return (
    <OfferQueueManagement
      records={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      lookups={lookups}
      initialSelected={scopedSelected}
      canOffer
      filters={{
        search: params.search,
        departmentId: params.departmentId,
        jobOpeningId: params.jobOpeningId,
        offerQueue: params.offerQueue ?? "all",
      }}
    />
  );
}

export default function ManagerOffersPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManagerOffersPageContent searchParams={searchParams} />
    </Suspense>
  );
}
