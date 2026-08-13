import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { OfferQueueManagement } from "@/components/recruitment/offer-queue-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import {
  getRecruitmentLookups,
  listOfferQueueCandidates,
} from "@/lib/recruitment/services/recruitment-queries";
import { createClient } from "@/lib/supabase/server";
import { candidateListParamsSchema } from "@/lib/validations/recruitment";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function CeoOffersPageContent({ searchParams }: PageProps) {
  const profile = await requireCeoPortal();
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

  const [result, lookups] = await Promise.all([
    listOfferQueueCandidates(supabase, profile, params),
    getRecruitmentLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <OfferQueueManagement
      records={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      lookups={lookups}
      initialSelected={null}
      canOffer={false}
      listOnly
      filters={{
        search: params.search,
        departmentId: params.departmentId,
        jobOpeningId: params.jobOpeningId,
        offerQueue: params.offerQueue ?? "all",
      }}
    />
  );
}

export default function CeoOffersPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CeoOffersPageContent searchParams={searchParams} />
    </Suspense>
  );
}
