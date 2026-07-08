import { OffersManagement } from "@/components/recruitment/offers-management";
import { createClient } from "@/lib/supabase/server";
import { canManageOffers } from "@/lib/recruitment/constants";
import {
  getRecruitmentLookups,
  listOffers,
} from "@/lib/recruitment/services/recruitment-queries";
import { offerListParamsSchema } from "@/lib/validations/recruitment";
import { requireServerPermission } from "@/lib/permissions/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OffersPage({ searchParams }: PageProps) {
  const profile = await requireServerPermission("recruitment.view");
  const supabase = await createClient();
  const raw = await searchParams;

  const params = offerListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    jobOpeningId: raw.jobOpeningId,
    offerStatus: raw.offerStatus,
    departmentId: raw.departmentId,
  });

  const [result, lookups] = await Promise.all([
    listOffers(supabase, profile, params),
    getRecruitmentLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <OffersManagement
      records={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      lookups={lookups}
      canOffer={canManageOffers(profile.permissionCodes)}
      filters={{
        search: params.search,
        jobOpeningId: params.jobOpeningId,
        offerStatus: params.offerStatus,
        departmentId: params.departmentId,
      }}
    />
  );
}
