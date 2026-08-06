import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { legacyHubTabRedirectUrl } from "@/lib/dashboard/hub-paths";
import { LeaveHubSection } from "@/lib/dashboard/self-service/leave-hub-section";
import { SELF_LEAVE_ROUTES } from "@/lib/leave/constants";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeaveSelfServicePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const legacy = legacyHubTabRedirectUrl(SELF_LEAVE_ROUTES.list, raw);
  if (legacy) redirect(legacy);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <LeaveHubSection section="my" searchParams={searchParams} />
    </Suspense>
  );
}
