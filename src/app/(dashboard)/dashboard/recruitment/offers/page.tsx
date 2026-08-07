import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { OfferQueueManagement } from "@/components/recruitment/offer-queue-management";
import { createClient } from "@/lib/supabase/server";
import {
  canManageOffers,
} from "@/lib/recruitment/constants";
import {
  getCandidateById,
  getRecruitmentLookups,
  listOfferQueueCandidates,
} from "@/lib/recruitment/services/recruitment-queries";
import { candidateListParamsSchema } from "@/lib/validations/recruitment";
import { requireServerPermission } from "@/lib/permissions/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function OffersPageContent({ searchParams }: PageProps) {
  const profile = await requireServerPermission("recruitment.view");
  const supabase = await createClient();
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

  const [result, lookups, selected] = await Promise.all([
    listOfferQueueCandidates(supabase, profile, params),
    getRecruitmentLookups(supabase, profile.employee.organizationId),
    candidateId
      ? getCandidateById(supabase, profile.employee.organizationId, candidateId)
      : Promise.resolve(null),
  ]);

  return (
    <OfferQueueManagement
      records={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      lookups={lookups}
      initialSelected={
        selected && ["ceo", "offer"].includes(selected.stage) ? selected : null
      }
      canOffer={canManageOffers(profile.permissionCodes)}
      filters={{
        search: params.search,
        departmentId: params.departmentId,
        jobOpeningId: params.jobOpeningId,
        offerQueue: params.offerQueue ?? "all",
      }}
    />
  );
}

export default function OffersPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OffersPageContent searchParams={searchParams} />
    </Suspense>
  );
}
