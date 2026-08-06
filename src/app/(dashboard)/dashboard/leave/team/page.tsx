import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { LeaveHubSection } from "@/lib/dashboard/self-service/leave-hub-section";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function LeaveTeamPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LeaveHubSection section="team" searchParams={searchParams} />
    </Suspense>
  );
}
